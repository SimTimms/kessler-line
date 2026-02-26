import * as THREE from 'three';

export let selectedTargetName: string | null = null;
export const selectedTargetVelocity = new THREE.Vector3();

export function selectTarget(name: string, velocity?: THREE.Vector3) {
  selectedTargetName = name;
  selectedTargetVelocity.copy(velocity ?? new THREE.Vector3());
}
