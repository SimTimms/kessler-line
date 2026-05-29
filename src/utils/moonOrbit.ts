import * as THREE from 'three';

export type MoonOrbitConfig = {
  /** World-space center of the moon body. */
  center: [number, number, number];
  /** World-space position at angle 0 — the highest point of the orbit (apoapsis). */
  apexPosition: [number, number, number];
  /** Orbit speed in radians per second. */
  speed: number;
  /** Angle offset at t = 0 (radians). */
  phase?: number;
};

const _center = new THREE.Vector3();
const _apexOffset = new THREE.Vector3();
const _apexUnit = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _orbitAxis = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _radial = new THREE.Vector3();
const _tangent = new THREE.Vector3();
export type MoonOrbitSample = {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
};

/** Circular orbit in the plane defined by the apex vector and world up. */
export function sampleMoonOrbit(
  config: MoonOrbitConfig,
  angle: number,
  target: MoonOrbitSample
): MoonOrbitSample {
  _center.set(config.center[0], config.center[1], config.center[2]);
  _apexOffset
    .set(config.apexPosition[0], config.apexPosition[1], config.apexPosition[2])
    .sub(_center);
  const radius = _apexOffset.length();
  _apexUnit.copy(_apexOffset).multiplyScalar(1 / radius);

  _orbitAxis.crossVectors(_apexUnit, _worldUp);
  if (_orbitAxis.lengthSq() < 1e-8) {
    _orbitAxis.set(1, 0, 0);
  } else {
    _orbitAxis.normalize();
  }

  _quat.setFromAxisAngle(_orbitAxis, angle);
  target.position.copy(_apexUnit).applyQuaternion(_quat).multiplyScalar(radius).add(_center);

  _radial.copy(target.position).sub(_center).normalize();
  target.tangent.crossVectors(_orbitAxis, _radial).normalize();
  return target;
}
