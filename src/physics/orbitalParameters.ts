import * as THREE from 'three';
import { orbitalEnergy, eccentricityFromEnergy } from '../maths/gravity';
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
  const energy = orbitalEnergy(v2, mu, Math.max(r, 1e-6));
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
  let eccentricity = 0;
  const semiLatusRectum = h2 / Math.max(mu, 1e-12);
  let trueAnomaly = 0;

  // Eccentricity vector: points from body centre toward periapsis
  // e_vec = ((v² - μ/r) * relPos - (relPos · relVel) * relVel) / μ
  const rDotV = radialVelocity * Math.max(r, 1e-6);
  _eVec
    .copy(relPos)
    .multiplyScalar(v2 - mu / Math.max(r, 1e-6))
    .addScaledVector(relVel, -rDotV)
    .divideScalar(mu);

  if (energy < 0) {
    // the ship does not have enough velocity to escape the gravity of the body
    //a = the semi-major axis of the orbit
    //the semi-major axis is the halfway distance between the ship and the body
    const a = -mu / (2 * energy);
    //e = the eccentricity of the orbit
    //the eccentricity is a measure of how much the orbit is elliptical
    //if the eccentricity is 0, the orbit is a circle
    //if the eccentricity is 1, the orbit is a parabola
    //if the eccentricity is greater than 1, the orbit is a hyperbola
    const e = eccentricityFromEnergy(energy, h2, mu);
    eccentricity = e;
    if (e < 1) {
      periapsis = h2 / (mu * (1 + e));
      apoapsis = a * (1 + e);
      semiMajorAxis = a;
      semiMinorAxis = a * Math.sqrt(1 - e * e);
      argumentOfPeriapsis = Math.atan2(_eVec.z, _eVec.x);
      if (periapsis > body.surfaceRadius) isOrbiting = true;
      // True anomaly: cos(ν) = ((p/r) - 1) / e, sign from radial velocity
      if (e > 1e-6) {
        const cosNu = Math.min(1, Math.max(-1, (semiLatusRectum / Math.max(r, 1e-6) - 1) / e));
        trueAnomaly = Math.acos(cosNu);
        if (radialVelocity < 0) trueAnomaly = -trueAnomaly;
      }
    }
  } else {
    const e = eccentricityFromEnergy(energy, h2, mu);
    eccentricity = e;
    if (e > 0) hyperbolicPeriapsis = h2 / (mu * (1 + e));
    argumentOfPeriapsis = Math.atan2(_eVec.z, _eVec.x);
    // True anomaly for hyperbolic orbit
    if (e > 1e-6) {
      const cosNu = Math.min(1, Math.max(-1, (semiLatusRectum / Math.max(r, 1e-6) - 1) / e));
      trueAnomaly = Math.acos(cosNu);
      if (radialVelocity < 0) trueAnomaly = -trueAnomaly;
    }
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
    eccentricity,
    semiLatusRectum,
    trueAnomaly,
  };
}
