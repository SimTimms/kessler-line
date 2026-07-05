import * as THREE from 'three';

export const hoveredObject = {
  id: null as string | null,
  label: '',
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
};

export function clearHoveredObject() {
  hoveredObject.id = null;
  hoveredObject.label = '';
}

export function setHoveredObject(
  id: string,
  label: string,
  position: THREE.Vector3,
  velocity: THREE.Vector3
) {
  hoveredObject.id = id;
  hoveredObject.label = label;
  hoveredObject.position.copy(position);
  hoveredObject.velocity.copy(velocity);
}
