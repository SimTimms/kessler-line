import * as THREE from 'three';

/**
 * Current aim of the targeting laser, written each frame by LaserRay and read by
 * weapons (e.g. the particle cannon) so their projectiles travel exactly along the beam.
 *  - origin:    world-space muzzle point (ship origin + a small forward offset)
 *  - direction: normalised world-space aim direction (toward the cursor)
 *  - valid:     false until LaserRay has produced a usable aim this session
 */
export const laserAimRef: {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  valid: boolean;
} = {
  origin: new THREE.Vector3(),
  direction: new THREE.Vector3(0, 0, 1),
  valid: false,
};
