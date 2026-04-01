import * as THREE from 'three';
import type { RefObject } from 'react';
import { getCollidables } from '../../context/CollisionRegistry';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import {
  DOCKING_PORT_LOCAL_Z,
  DOCKING_PORT_RADIUS,
  SHIP_COLLISION_ID,
  shipAcceleration,
  shipVelocity,
  fuel,
  o2,
  isRefueling,
  isTransferringO2,
  setFuel,
  setO2,
} from '../../context/ShipState';
import { FUEL_REFILL_RATE, O2_REFILL_RATE, O2_DRAIN_RATE } from '../../config/damageConfig';

const _collidablePos = new THREE.Vector3();
const _boxQuat = new THREE.Quaternion();
const _invBoxQuat = new THREE.Quaternion();
const _localShipPos = new THREE.Vector3();
const _localForward = new THREE.Vector3();
const _portWorldPos = new THREE.Vector3();
const _dockVel = new THREE.Vector3();
const _relVel = new THREE.Vector3();

interface DockedStateParams {
  group: THREE.Group;
  dockedTo: { current: string | null };
  thrusterLightRef: RefObject<THREE.PointLight>;
  thrusterLightIntensity: { current: number };
  rawDelta: number;
}

export function applyDockedState({
  group,
  dockedTo,
  thrusterLightRef,
  thrusterLightIntensity,
  rawDelta,
}: DockedStateParams): boolean {
  if (!dockedTo.current) return false;

  const dockerEntry = getCollidables().find((c) => c.id === dockedTo.current);
  if (dockerEntry) {
    dockerEntry.getWorldPosition(_collidablePos);
    if (dockerEntry.getWorldQuaternion) {
      dockerEntry.getWorldQuaternion(_boxQuat);
      group.quaternion.copy(_boxQuat);
    }
    _localForward.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat);
    group.position.copy(_collidablePos).sub(_localForward);
  }

  shipVelocity.set(0, 0, 0);
  shipAcceleration.current = 0;
  thrusterLightIntensity.current = 0;
  if (thrusterLightRef.current) thrusterLightRef.current.intensity = 0;
  if (isRefueling.current) setFuel(Math.min(100, fuel + FUEL_REFILL_RATE * rawDelta));
  if (isTransferringO2.current) setO2(Math.min(100, o2 + O2_REFILL_RATE * rawDelta));
  setO2(Math.max(0, o2 - O2_DRAIN_RATE * rawDelta));
  // shipPosRef.current.copy(group.position);
  minimapShipPosition.copy(group.position);
  return true;
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
  if (relSpeed >= 4) return;

  dockedTo.current = bayEntry.id;
  window.dispatchEvent(
    new CustomEvent('ShipDocked', { detail: { stationId: bayEntry.stationId ?? null } })
  );
  velocity.set(0, 0, 0);
  bayEntry.getWorldPosition(_collidablePos);
  if (bayEntry.getWorldQuaternion) {
    bayEntry.getWorldQuaternion(_boxQuat);
  } else {
    _boxQuat.identity();
  }
  group.quaternion.copy(_boxQuat);
  _localForward.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat);
  group.position.copy(_collidablePos).sub(_localForward);
}
