import * as THREE from 'three';

export const floatingOriginOffsetRef = { current: new THREE.Vector3() };

export const floatingOriginActiveRef = { current: false };

// Convert simulation-space position to render-space position

export function simulationToRenderSpace(
  simulation: THREE.Vector3,
  target = new THREE.Vector3()
): THREE.Vector3 {
  return target.copy(simulation).add(floatingOriginOffsetRef.current);
}

// Convert render-space position to simulation-space position - reverse of simulationToRenderSpace
export function renderToSimulationSpace(
  render: THREE.Vector3,
  target = new THREE.Vector3()
): THREE.Vector3 {
  if (!floatingOriginActiveRef.current) return target.copy(render);
  return target.copy(render).sub(floatingOriginOffsetRef.current);
}
