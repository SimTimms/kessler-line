import * as THREE from 'three';
import type { CollidableEntry } from '../context/CollisionRegistry';
import {
  DEFAULT_DOCK_CAPTURE_PROFILE,
  RENDEZVOUS_DOCK_CAPTURE_PROFILE,
  type DockCaptureProfile,
} from '../config/dockCaptureConfig';

const _dockPos = new THREE.Vector3();
const _dockQuat = new THREE.Quaternion();
const _dockInvQuat = new THREE.Quaternion();
const _localPoint = new THREE.Vector3();
const _offsetWorld = new THREE.Vector3();

export function getDockCaptureProfile(entry: CollidableEntry): DockCaptureProfile {
  if (entry.dockingProfile) return entry.dockingProfile;
  if (entry.id.startsWith('docking-bay-rendezvous-')) return RENDEZVOUS_DOCK_CAPTURE_PROFILE;
  return DEFAULT_DOCK_CAPTURE_PROFILE;
}

export function pointDistanceToDockBox(pointWorld: THREE.Vector3, dockEntry: CollidableEntry): number {
  dockEntry.getWorldPosition(_dockPos);
  if (dockEntry.getWorldQuaternion) {
    dockEntry.getWorldQuaternion(_dockQuat);
  } else {
    _dockQuat.identity();
  }
  _dockInvQuat.copy(_dockQuat).invert();
  _localPoint.subVectors(pointWorld, _dockPos).applyQuaternion(_dockInvQuat);
  const he = dockEntry.shape.type === 'box' ? dockEntry.shape.halfExtents : new THREE.Vector3(0, 0, 0);
  const px = _localPoint.x - THREE.MathUtils.clamp(_localPoint.x, -he.x, he.x);
  const py = _localPoint.y - THREE.MathUtils.clamp(_localPoint.y, -he.y, he.y);
  const pz = _localPoint.z - THREE.MathUtils.clamp(_localPoint.z, -he.z, he.z);
  return Math.sqrt(px * px + py * py + pz * pz);
}

export function shipLocalOffsetToWorld(
  shipGroup: THREE.Group,
  localOffset: readonly [number, number, number],
  out: THREE.Vector3
): THREE.Vector3 {
  return out
    .set(localOffset[0], localOffset[1], localOffset[2])
    .applyQuaternion(shipGroup.quaternion)
    .add(shipGroup.position);
}

export function dockLocalOffsetToWorldPose(
  dockEntry: CollidableEntry,
  dockLocalOffset: readonly [number, number, number],
  outPosition: THREE.Vector3,
  outQuaternion: THREE.Quaternion
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  dockEntry.getWorldPosition(_dockPos);
  if (dockEntry.getWorldQuaternion) {
    dockEntry.getWorldQuaternion(_dockQuat);
    outQuaternion.copy(_dockQuat);
  } else {
    _dockQuat.identity();
    outQuaternion.identity();
  }
  _offsetWorld
    .set(dockLocalOffset[0], dockLocalOffset[1], dockLocalOffset[2])
    .applyQuaternion(_dockQuat);
  outPosition.copy(_dockPos).add(_offsetWorld);
  return { position: outPosition, quaternion: outQuaternion };
}
