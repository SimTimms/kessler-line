import * as THREE from 'three';

/** Mutable ref holding the ship's current world position.
 *  Written each frame by Spaceship (via positionRef); read by HUD and other overlays. */
export const shipPosRef: { current: THREE.Vector3 } = {
  current: new THREE.Vector3(),
};
