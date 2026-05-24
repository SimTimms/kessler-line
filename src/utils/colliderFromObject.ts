import * as THREE from 'three';

export type ObjectBoxColliderData = {
  halfExtents: THREE.Vector3;
  /** Local offset so the mesh AABB center sits on the collider ref origin. */
  meshOffset: THREE.Vector3;
};

/** Derive an oriented box collider from a loaded model's axis-aligned bounds. */
export function boxColliderFromObject(object: THREE.Object3D, scale = 1): ObjectBoxColliderData {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  size.multiplyScalar(scale);
  center.multiplyScalar(scale);
  return {
    halfExtents: size.multiplyScalar(0.5),
    meshOffset: center.negate(),
  };
}
