import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import type { InitCircularOrbitOptions, InitCircularOrbitResult } from './types';

/**
 * Compute initial position and velocity for a circular orbit around a body.
 *
 * Reproduces the old nested-group transform chain:
 * 1. Offset on X axis at `radius`
 * 2. Rotate by `phase` around Y (orbit phase)
 * 3. Apply inclination via Euler(incX, 0, incZ, 'ZXY') — matches the old
 *    group nesting (outer rotation-z, inner rotation-x)
 * 4. Tangent derived from phase derivative, same inclination applied
 * 5. Velocity = body.velocity + tangent * sqrt(mu / radius)
 */
export function initCircularOrbit({
  bodyId,
  radius,
  phase,
  inclinationX = 0,
  inclinationZ = 0,
}: InitCircularOrbitOptions): InitCircularOrbitResult {
  const body = gravityBodies.get(bodyId);
  if (!body) throw new Error(`initCircularOrbit: unknown body "${bodyId}"`);

  const euler = new THREE.Euler(inclinationX, 0, inclinationZ, 'ZXY');

  // Position offset: start on X axis, rotate by phase around Y, apply inclination
  const offset = new THREE.Vector3(
    radius * Math.cos(phase),
    0,
    radius * Math.sin(phase),
  );
  offset.applyEuler(euler);

  const position = new THREE.Vector3().copy(body.position).add(offset);

  // Tangent: derivative of R_y(phase) applied to (R, 0, 0) → (-sin, 0, cos),
  // same inclination applied, normalized.
  const tangent = new THREE.Vector3(
    -Math.sin(phase),
    0,
    Math.cos(phase),
  );
  tangent.applyEuler(euler).normalize();

  const vCircular = Math.sqrt(body.mu / radius);
  const velocity = new THREE.Vector3()
    .copy(body.velocity)
    .addScaledVector(tangent, vCircular);

  return {
    position,
    velocity,
    bodyVelocity: body.velocity.clone(),
    bodyId,
  };
}
