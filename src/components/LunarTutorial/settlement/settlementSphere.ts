import * as THREE from 'three';

const _pole = new THREE.Vector3(0, 1, 0);
const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _quat = new THREE.Quaternion();
/** Spherical cap half-angle from surface-area fraction (0–1). */
export function coverageToAngularRadius(coverage: number): number {
  return Math.acos(1 - 2 * THREE.MathUtils.clamp(coverage, 0, 1));
}

/** Tangent-plane radius at the cap edge for layout sampling. */
export function maxFlatRadiusForCap(moonRadius: number, angularRadius: number): number {
  return moonRadius * Math.sin(angularRadius);
}

/**
 * Map a flat cap coordinate to a point on the moon (+Y pole), with local +Y along outward normal.
 * `maxFlatRadius` must be the full cap extent, not the cluster bounding box.
 */
export function flatToSphere(
  flatX: number,
  flatZ: number,
  maxFlatRadius: number,
  moonRadius: number,
  angularRadius: number,
  surfaceLift: number,
  outPosition: THREE.Vector3,
  outQuaternion: THREE.Quaternion
): void {
  const r = THREE.MathUtils.clamp(Math.hypot(flatX, flatZ) / maxFlatRadius, 0, 1);
  const bearing = Math.atan2(flatZ, flatX);
  const angle = r * angularRadius;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);

  _normal.set(sinA * Math.cos(bearing), cosA, sinA * Math.sin(bearing)).normalize();
  outPosition.copy(_normal).multiplyScalar(moonRadius + surfaceLift);
  outQuaternion.setFromUnitVectors(_pole, _normal);
}

/** Unit normal at a surface point (from sphere center). */
export function surfaceNormalAt(position: THREE.Vector3, out: THREE.Vector3 = _normal): THREE.Vector3 {
  return out.copy(position).normalize();
}

/** Great-circle interpolation between two surface points. */
export function slerpSurface(
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
  moonRadius: number,
  surfaceLift: number,
  out: THREE.Vector3
): THREE.Vector3 {
  _normal.copy(a).normalize();
  _tangent.copy(b).normalize();
  const dot = THREE.MathUtils.clamp(_normal.dot(_tangent), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return out.copy(a);
  }
  const sinOmega = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / sinOmega;
  const wb = Math.sin(t * omega) / sinOmega;
  return out
    .copy(_normal)
    .multiplyScalar(wa)
    .addScaledVector(_tangent, wb)
    .normalize()
    .multiplyScalar(moonRadius + surfaceLift);
}

/** Tangent frame on the sphere for offsetting roadside geometry. */
export function geodesicFrame(
  position: THREE.Vector3,
  toward: THREE.Vector3,
  outTangent: THREE.Vector3,
  outBitangent: THREE.Vector3,
  outNormal: THREE.Vector3 = _normal
): void {
  outNormal.copy(position).normalize();
  outTangent.copy(toward).sub(outNormal.clone().multiplyScalar(toward.dot(outNormal)));
  if (outTangent.lengthSq() < 1e-8) {
    outTangent.set(1, 0, 0).projectOnPlane(outNormal);
  }
  outTangent.normalize();
  outBitangent.crossVectors(outNormal, outTangent).normalize();
}

export function buildGeodesicLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  moonRadius: number,
  surfaceLift: number,
  out: Float32Array
): void {
  const point = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    slerpSurface(start, end, t, moonRadius, surfaceLift, point);
    const o = i * 3;
    out[o] = point.x;
    out[o + 1] = point.y;
    out[o + 2] = point.z;
  }
}

/** Apply a local XZ offset in the dome/road tangent frame. */
export function applyTangentOffset(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  localX: number,
  localY: number,
  localZ: number,
  out: THREE.Vector3
): THREE.Vector3 {
  _tangent.set(localX, localY, localZ).applyQuaternion(quaternion);
  return out.copy(position).add(_tangent);
}
