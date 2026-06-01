import * as THREE from 'three';

const _worldUp = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _yawQuat = new THREE.Quaternion();
const _rollQuat = new THREE.Quaternion();
const _composed = new THREE.Quaternion();

function sanitizeAngle(radians: number): number {
  return Number.isFinite(radians) ? radians : 0;
}

/** Heading in the XZ plane from ship-local +Z. */
export function getYawFromQuaternion(quaternion: THREE.Quaternion): number {
  _forward.set(0, 0, 1).applyQuaternion(quaternion);
  _forward.y = 0;
  if (_forward.lengthSq() < 1e-10) return 0;
  _forward.normalize();
  return Math.atan2(_forward.x, _forward.z);
}

/** World Y yaw, then roll around the yawed forward axis (+Z). */
export function applyYawAndRoll(
  target: THREE.Object3D,
  yaw: number,
  roll: number,
  outQuaternion: THREE.Quaternion = _composed
): THREE.Quaternion {
  const safeYaw = sanitizeAngle(yaw);
  const safeRoll = sanitizeAngle(roll);

  _yawQuat.setFromAxisAngle(_worldUp, safeYaw);
  _forward.set(0, 0, 1).applyQuaternion(_yawQuat);
  if (_forward.lengthSq() < 1e-10) {
    _forward.set(0, 0, 1);
  } else {
    _forward.normalize();
  }
  _rollQuat.setFromAxisAngle(_forward, safeRoll);
  outQuaternion.copy(_yawQuat).multiply(_rollQuat).normalize();
  target.quaternion.copy(outQuaternion);
  return outQuaternion;
}
