import * as THREE from 'three';

/**
 * When a {@link FloatingOrigin} is active, this holds its group.position each frame
 * (typically `-focus`). Add to a simulation-space world point to get render-space coords.
 */
export const floatingOriginOffsetRef = { current: new THREE.Vector3() };

/** True while a FloatingOrigin component is mounted and updating. */
export const floatingOriginActiveRef = { current: false };

/** Simulation-space world position → render-space (for camera/post FX). */
export function simulationToRenderSpace(
  simulation: THREE.Vector3,
  target = new THREE.Vector3()
): THREE.Vector3 {
  return target.copy(simulation).add(floatingOriginOffsetRef.current);
}

/** Render-space world position → simulation-space (inverse of {@link simulationToRenderSpace}). */
export function renderToSimulationSpace(
  render: THREE.Vector3,
  target = new THREE.Vector3()
): THREE.Vector3 {
  if (!floatingOriginActiveRef.current) return target.copy(render);
  return target.copy(render).sub(floatingOriginOffsetRef.current);
}
