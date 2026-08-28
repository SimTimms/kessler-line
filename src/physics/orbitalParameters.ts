import * as THREE from 'three';
import type { GravityBody, OrbitalParameters } from './types';

// Scratch vector — allocated once.
const _hVec = new THREE.Vector3();

/**
 * Compute conic orbital parameters from relative position/velocity.
 * Pure math — no side effects.
 *
 * @param body    - The gravity body being orbited.
 * @param bodyId  - Registry key for the body.
 * @param relPos  - Ship position relative to body centre.
 * @param relVel  - Ship velocity relative to body velocity.
 * @param r       - Distance from body centre (pre-computed sqrt of distSq).
 */
export function computeOrbitalParameters(
  body: GravityBody,
  bodyId: string,
  relPos: THREE.Vector3,
  relVel: THREE.Vector3,
  r: number,
): OrbitalParameters {
  const mu = body.mu;
  const v2 = relVel.lengthSq();
  const energy = 0.5 * v2 - mu / Math.max(r, 1e-6);
  const radialVelocity = relVel.dot(relPos) / Math.max(r, 1e-6);

  _hVec.copy(relPos).cross(relVel);
  const h2 = _hVec.lengthSq();

  let isOrbiting = false;
  let periapsis = 0;
  let apoapsis = 0;
  let hyperbolicPeriapsis = 0;

  if (energy < 0) {
    const a = -mu / (2 * energy);
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
    if (e < 1) {
      periapsis = h2 / (mu * (1 + e));
      apoapsis = a * (1 + e);
      if (periapsis > body.surfaceRadius) isOrbiting = true;
    }
  } else {
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
    if (e > 0) hyperbolicPeriapsis = h2 / (mu * (1 + e));
  }

  return {
    bodyId,
    isOrbiting,
    periapsis,
    apoapsis,
    surfaceRadius: body.surfaceRadius,
    radialVelocity,
    hyperbolicPeriapsis,
  };
}
