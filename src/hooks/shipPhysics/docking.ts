import * as THREE from 'three';
import type { RefObject } from 'react';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../../context/ShipState';
import { FUEL_REFILL_RATE, O2_REFILL_RATE, o2DrainRateForCrew } from '../../config/damageConfig';
import { resourceRateRefs } from '../../context/ResourceRates';
import { zeroThrusterLights } from './thrusterLight';
import { autopilotActive, disableAutopilot } from '../../context/AutopilotState';
import {
  dockLocalOffsetToWorldPose,
  getDockCaptureProfile,
  pointDistanceToDockBox,
  shipLocalOffsetToWorld,
} from '../../utils/dockingCapture';
import {
  setVesselFuel,
  setVesselO2,
  type VesselRuntimeState,
} from '../../context/VesselStateStore';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { setFuel, setO2 } from '../../context/ShipState';

const _portWorldPos = new THREE.Vector3();
const _dockVel = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _desiredDockPos = new THREE.Vector3();
const _desiredDockQuat = new THREE.Quaternion();

function isInHierarchy(root: THREE.Object3D, candidate: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = candidate;
  while (node) {
    if (node === root) return true;
    node = node.parent;
  }
  return false;
}

/** Compute the world pose that aligns the ship nose with a docking bay. */
function computeDockedWorldPose(dockerEntry: CollidableEntry): {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
} {
  const profile = getDockCaptureProfile(dockerEntry);
  return dockLocalOffsetToWorldPose(
    dockerEntry,
    profile.attachOffsetLocal,
    _desiredDockPos,
    _desiredDockQuat
  );
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
  vesselId: string;
  vesselState: VesselRuntimeState;
  trackHudRates?: boolean;
  thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>;
  thrusterLightIntensities: { current: number[] };
  rawDelta: number;
}

/** Fuel/O2/thruster state while docked — no transform updates here. */
export function applyDockedResources({
  vesselId,
  vesselState,
  trackHudRates = true,
  thrusterLightRefs,
  thrusterLightIntensities,
  rawDelta,
}: DockedResourcesParams): void {
  vesselState.shipVelocity.set(0, 0, 0);
  vesselState.shipAcceleration.current = 0;
  zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);

  const o2Drain = o2DrainRateForCrew(vesselState.shipCrew);

  let fuelRate = 0;
  let o2Rate = -o2Drain;
  if (vesselState.isRefueling.current) {
    fuelRate += FUEL_REFILL_RATE;
    const nextFuel = Math.min(100, vesselState.fuel + FUEL_REFILL_RATE * rawDelta);
    if (vesselId === PLAYER_VESSEL_ID) {
      setFuel(nextFuel);
    } else {
      setVesselFuel(vesselId, nextFuel);
    }
  }
  if (vesselState.isTransferringO2.current) {
    o2Rate += O2_REFILL_RATE;
    const nextO2 = Math.min(100, vesselState.o2 + O2_REFILL_RATE * rawDelta);
    if (vesselId === PLAYER_VESSEL_ID) {
      setO2(nextO2);
    } else {
      setVesselO2(vesselId, nextO2);
    }
  }
  const drainedO2 = Math.max(0, vesselState.o2 - o2Drain * rawDelta);
  if (vesselId === PLAYER_VESSEL_ID) {
    setO2(drainedO2);
  } else {
    setVesselO2(vesselId, drainedO2);
  }

  if (trackHudRates) {
    resourceRateRefs.power.current = 0;
    resourceRateRefs.fuel.current = fuelRate;
    resourceRateRefs.o2.current = o2Rate;
  }
}

interface DockingPortParams {
  group: THREE.Group;
  dockingPort: THREE.Group | null;
  dockedTo: { current: string | null };
  velocity: THREE.Vector3;
  selfCollisionId?: string;
  emitDockingEvents?: boolean;
}

export function checkDockingPort({
  group,
  dockingPort,
  dockedTo,
  velocity,
  selfCollisionId = SHIP_COLLISION_ID,
  emitDockingEvents = true,
}: DockingPortParams) {
  if (dockedTo.current || !dockingPort) return;

  const bayEntry = getCollidables().find((c) => {
    if (c.id === selfCollisionId) return false;
    if (c.shape.type !== 'box') return false;
    if (!c.id.startsWith('docking-bay')) return false;
    const bayObject = c.getObject3D?.() ?? null;
    if (bayObject && (isInHierarchy(group, bayObject) || isInHierarchy(bayObject, group))) {
      return false;
    }
    const dockingProfile = getDockCaptureProfile(c);
    if (dockingProfile.mode === 'nose') {
      dockingPort.getWorldPosition(_portWorldPos);
    } else {
      shipLocalOffsetToWorld(group, dockingProfile.probeLocalOffset, _portWorldPos);
    }
    return pointDistanceToDockBox(_portWorldPos, c) < dockingProfile.captureRadius;
  });

  if (!bayEntry) return;
  const dockingProfile = getDockCaptureProfile(bayEntry);
  const bayVel = bayEntry.getWorldVelocity
    ? bayEntry.getWorldVelocity(_dockVel)
    : _dockVel.set(0, 0, 0);
  const relSpeed = _relVel.subVectors(velocity, bayVel).length();
  if (relSpeed >= dockingProfile.maxRelativeSpeed) return;

  dockedTo.current = bayEntry.id;
  if (emitDockingEvents && autopilotActive.current) {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  }
  if (emitDockingEvents) {
    window.dispatchEvent(
      new CustomEvent('ShipDocked', { detail: { stationId: bayEntry.stationId ?? null } })
    );
  }
  velocity.set(0, 0, 0);
  attachShipToDock(group, bayEntry);
}
