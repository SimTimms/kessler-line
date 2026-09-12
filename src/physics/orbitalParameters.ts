import * as THREE from 'three';
import type { GravityBody, OrbitalParameters } from './types';

// Scratch vectors — allocated once.
// hVEC = "help vector" - it's used to help compute the orbital parameters
const _hVec = new THREE.Vector3();
const _eVec = new THREE.Vector3();

/**
 * Compute conic orbital parameters from relative position/velocity.
 * a conic orbit is an ellipse, parabola, or hyperbola
 * I'm ignoring parabola because it's apparently almost impossible. And I think theoretically, unless I change anything in the game design, as soon as an object achieves a hyperbolic orbit, it will translate to a heliocentric orbit (around the sun).
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
  r: number
): OrbitalParameters {
  const mu = body.mu;
  const v2 = relVel.lengthSq();
  const orbitalEnergy = 0.5 * v2 - mu / Math.max(r, 1e-6);
  const radialVelocity = relVel.dot(relPos) / Math.max(r, 1e-6);
  _hVec.copy(relPos).cross(relVel);
  const h2 = _hVec.lengthSq();

  let isOrbiting = false;
  let periapsis = 0;
  let apoapsis = 0;
  let hyperbolicPeriapsis = 0;
  let semiMajorAxis = 0;
  let semiMinorAxis = 0;
  let argumentOfPeriapsis = 0;

  // Eccentricity vector: points from body centre toward periapsis
  // e_vec = ((v² - μ/r) * relPos - (relPos · relVel) * relVel) / μ
  const rDotV = radialVelocity * Math.max(r, 1e-6);
  _eVec
    .copy(relPos)
    .multiplyScalar(v2 - mu / Math.max(r, 1e-6))
    .addScaledVector(relVel, -rDotV)
    .divideScalar(mu);

  // console.log('orbitalEnergy', orbitalEnergy);
  if (orbitalEnergy < 0) {
    // the ship does not have enough velocity to escape the gravity of the body
    //a = the semi-major axis of the orbit
    //the semi-major axis is the halfway distance between the ship and the body
    const a = -mu / (2 * orbitalEnergy);
    //e = the eccentricity of the orbit
    //the eccentricity is a measure of how much the orbit is elliptical
    //if the eccentricity is 0, the orbit is a circle
    //if the eccentricity is 1, the orbit is a parabola
    //if the eccentricity is greater than 1, the orbit is a hyperbola
    const e = Math.sqrt(Math.max(0, 1 + (2 * orbitalEnergy * h2) / (mu * mu)));
    if (e < 1) {
      periapsis = h2 / (mu * (1 + e));
      apoapsis = a * (1 + e);
      semiMajorAxis = a;
      semiMinorAxis = a * Math.sqrt(1 - e * e);
      argumentOfPeriapsis = Math.atan2(_eVec.z, _eVec.x);
      if (periapsis > body.surfaceRadius) isOrbiting = true;
    }
  } else {
    const e = Math.sqrt(Math.max(0, 1 + (2 * orbitalEnergy * h2) / (mu * mu)));
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
    semiMajorAxis,
    semiMinorAxis,
    argumentOfPeriapsis,
  };
}
