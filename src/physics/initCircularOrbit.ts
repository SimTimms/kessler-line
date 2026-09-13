import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { circularSpeed } from '../maths/gravity';
import type { InitCircularOrbitOptions, InitCircularOrbitResult } from './types';

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
  const offset = new THREE.Vector3(radius * Math.cos(phase), 0, radius * Math.sin(phase));
  offset.applyEuler(euler);

  const position = new THREE.Vector3().copy(body.position).add(offset);

  // Tangent: derivative of R_y(phase) applied to (R, 0, 0) → (-sin, 0, cos),
  // same inclination applied, normalized.
  const tangent = new THREE.Vector3(-Math.sin(phase), 0, Math.cos(phase));
  tangent.applyEuler(euler).normalize();

  const vCircular = circularSpeed(body.mu, radius);
  const velocity = new THREE.Vector3().copy(body.velocity).addScaledVector(tangent, vCircular);

  return {
    position,
    velocity,
    bodyVelocity: body.velocity.clone(),
    bodyId,
  };
}
