import * as THREE from 'three';
import { findPrimaryBody } from './findPrimaryBody';
import type { OrbitState, StepResult } from './types';

// Scratch vectors — allocated once, never per-frame.
const _gravDir = new THREE.Vector3();
const _deltaV = new THREE.Vector3();

/**
 * Core gravity integrator shared by all orbiting objects.
 *
 * Applies gravitational acceleration and reference-frame tracking to the
 * given `OrbitState`. Does NOT integrate position — callers do
 * `state.position.addScaledVector(state.velocity, dt)` after, allowing
 * thrust injection between the gravity step and position integration.
 */
export function stepOrbit(state: OrbitState, dt: number): StepResult {
  const primary = findPrimaryBody(state.position);

  const result: StepResult = {
    primaryBodyId: primary?.id ?? null,
    soiTransition: null,
    distSq: primary?.distSq ?? 0,
  };

  if (primary) {
    const { body, id: bodyId, distSq } = primary;

    // Gravity acceleration: a = mu/r² toward body centre
    _gravDir.subVectors(body.position, state.position).normalize();
    state.velocity.addScaledVector(_gravDir, (body.mu / distSq) * dt);

    const bodyChanged = state.primaryBodyId !== bodyId;

    if (bodyChanged) {
      // SOI transition — rebase velocity into the new body's reference frame
      result.soiTransition = { from: state.primaryBodyId, to: bodyId };
      if (state.primaryBodyId) state.velocity.sub(state.primaryBodyVelocity);
      state.primaryBodyId = bodyId;
      state.primaryBodyVelocity.copy(body.velocity);
      state.velocity.add(body.velocity);
    } else {
      // Same body — track its acceleration (e.g. Mars orbiting the Sun)
      _deltaV.subVectors(body.velocity, state.primaryBodyVelocity);
      state.velocity.add(_deltaV);
      state.primaryBodyVelocity.copy(body.velocity);
    }
  } else {
    // Outside all SOIs — exit reference frame if we were in one
    if (state.primaryBodyId) {
      state.velocity.sub(state.primaryBodyVelocity);
      state.primaryBodyId = null;
      state.primaryBodyVelocity.set(0, 0, 0);
    }
  }

  return result;
}
