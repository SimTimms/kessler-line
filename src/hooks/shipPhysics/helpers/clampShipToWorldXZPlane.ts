import * as THREE from 'three';

const _worldPos = new THREE.Vector3();

/** Gameplay plane is world XZ (Y = 0), including when a parent group is banked. */
export function clampShipToWorldXZPlane(
  group: THREE.Group,
  physicsPosition: THREE.Vector3,
  velocity: THREE.Vector3
) {
  velocity.y = 0;
  group.getWorldPosition(_worldPos);
  if (Math.abs(_worldPos.y) <= 1e-4) {
    physicsPosition.copy(group.position);
    return;
  }
  _worldPos.y = 0;
  if (group.parent) {
    group.parent.worldToLocal(_worldPos);
    group.position.copy(_worldPos);
  } else {
    group.position.y = 0;
  }
  physicsPosition.copy(group.position);
}
