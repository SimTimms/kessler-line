import * as THREE from 'three';
import type { RefObject } from 'react';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import {
  DOCKING_PORT_LOCAL_Z,
  DOCKING_PORT_RADIUS,
  SHIP_COLLISION_ID,
  shipAcceleration,
  shipVelocity,
  fuel,
  o2,
  shipCrew,
  isRefueling,
  isTransferringO2,
  setFuel,
  setO2,
} from '../../context/ShipState';
import { FUEL_REFILL_RATE, O2_REFILL_RATE, o2DrainRateForCrew } from '../../config/damageConfig';
import { resourceRateRefs } from '../../context/ResourceRates';
import { zeroThrusterLights } from './thrusterLight';
import { autopilotActive, disableAutopilot } from '../../context/AutopilotState';

const _collidablePos = new THREE.Vector3();
const _boxQuat = new THREE.Quaternion();
const _invBoxQuat = new THREE.Quaternion();
const _localShipPos = new THREE.Vector3();
const _localForward = new THREE.Vector3();
const _portWorldPos = new THREE.Vector3();
const _dockVel = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _desiredDockPos = new THREE.Vector3();
const _desiredDockQuat = new THREE.Quaternion();

/** Compute the world pose that aligns the ship nose with a docking bay. */
function computeDockedWorldPose(dockerEntry: CollidableEntry): {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
} {
  dockerEntry.getWorldPosition(_collidablePos);
  if (dockerEntry.getWorldQuaternion) {
    dockerEntry.getWorldQuaternion(_boxQuat);
    _desiredDockQuat.copy(_boxQuat);
  } else {
    _desiredDockQuat.identity();
  }
  _localForward.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat);
  _desiredDockPos.copy(_collidablePos).sub(_localForward);
  return { position: _desiredDockPos, quaternion: _desiredDockQuat };
}

/**
 * Parent the ship to the docking bay so orbital motion is inherited from the
 * scene graph (no per-frame world-coordinate resync / lerp).
 */
export function attachShipToDock(group: THREE.Group, dockerEntry: CollidableEntry): void {
  const dockObject = dockerEntry.getObject3D?.() ?? null;
  const { position, quaternion } = computeDockedWorldPose(dockerEntry);

  if (dockObject) {
    if (group.parent !== dockObject) {
      // Set world pose while still on the scene root, then reparent (preserves world transform).
      group.position.copy(position);
      group.quaternion.copy(quaternion);
      dockObject.attach(group);
    }
    return;
  }

  // Static dock with no render object — hard snap in world space.
  group.position.copy(position);
  group.quaternion.copy(quaternion);
}

/** Restore the ship to the scene root when undocking, preserving world transform. */
export function detachShipFromDock(group: THREE.Group, scene: THREE.Object3D): void {
  if (!group.parent || group.parent === scene) return;
  scene.attach(group);
}

interface DockedResourcesParams {
  thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>;
  thrusterLightIntensities: { current: number[] };
  rawDelta: number;
}

/** Fuel/O2/thruster state while docked — no transform updates here. */
export function applyDockedResources({
  thrusterLightRefs,
  thrusterLightIntensities,
  rawDelta,
}: DockedResourcesParams): void {
  shipVelocity.set(0, 0, 0);
  shipAcceleration.current = 0;
  zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);

  const o2Drain = o2DrainRateForCrew(shipCrew);

  let fuelRate = 0;
  let o2Rate = -o2Drain;
  if (isRefueling.current) {
    fuelRate += FUEL_REFILL_RATE;
    setFuel(Math.min(100, fuel + FUEL_REFILL_RATE * rawDelta));
  }
  if (isTransferringO2.current) {
    o2Rate += O2_REFILL_RATE;
    setO2(Math.min(100, o2 + O2_REFILL_RATE * rawDelta));
  }
  setO2(Math.max(0, o2 - o2Drain * rawDelta));

  resourceRateRefs.power.current = 0;
  resourceRateRefs.fuel.current = fuelRate;
  resourceRateRefs.o2.current = o2Rate;
}

interface DockingPortParams {
  group: THREE.Group;
  dockingPort: THREE.Group | null;
  dockedTo: { current: string | null };
  velocity: THREE.Vector3;
}

export function checkDockingPort({ group, dockingPort, dockedTo, velocity }: DockingPortParams) {
  if (dockedTo.current || !dockingPort) return;

  dockingPort.getWorldPosition(_portWorldPos);
  const bayEntry = getCollidables().find((c) => {
    if (c.id === SHIP_COLLISION_ID) return false;
    if (c.shape.type !== 'box') return false;
    if (!c.id.startsWith('docking-bay')) return false;
    c.getWorldPosition(_collidablePos);
    if (c.getWorldQuaternion) {
      c.getWorldQuaternion(_boxQuat);
    } else {
      _boxQuat.identity();
    }
    _invBoxQuat.copy(_boxQuat).invert();
    _localShipPos.subVectors(_portWorldPos, _collidablePos).applyQuaternion(_invBoxQuat);
    const he = c.shape.halfExtents;
    const px = _localShipPos.x - THREE.MathUtils.clamp(_localShipPos.x, -he.x, he.x);
    const py = _localShipPos.y - THREE.MathUtils.clamp(_localShipPos.y, -he.y, he.y);
    const pz = _localShipPos.z - THREE.MathUtils.clamp(_localShipPos.z, -he.z, he.z);
    return Math.sqrt(px * px + py * py + pz * pz) < DOCKING_PORT_RADIUS;
  });

  if (!bayEntry) return;
  const bayVel = bayEntry.getWorldVelocity
    ? bayEntry.getWorldVelocity(_dockVel)
    : _dockVel.set(0, 0, 0);
  const relSpeed = _relVel.subVectors(velocity, bayVel).length();
  // Large rendezvous bays are interior capture volumes, so allow faster closure
  // than nose-to-port docking.
  const relSpeedLimit = bayEntry.id.startsWith('docking-bay-rendezvous-') ? 18 : 4;
  if (relSpeed >= relSpeedLimit) return;

  dockedTo.current = bayEntry.id;
  if (autopilotActive.current) {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  }
  window.dispatchEvent(
    new CustomEvent('ShipDocked', { detail: { stationId: bayEntry.stationId ?? null } })
  );
  velocity.set(0, 0, 0);
  attachShipToDock(group, bayEntry);
}
