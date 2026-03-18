import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { RETROBURN_DONE_SPEED, MAX_RETROBURN_ANGLE } from './constants';

const _retroDir = new THREE.Vector3();

/**
 * Handles the 'retroburn' phase: flip nose to the retrograde direction and
 * fire the main engine to kill or reduce velocity.
 *
 * Gravity bodies (planets):
 *   - Brake until speed ≤ PLANET_RETRO_ARRIVAL_SPEED (100 m/s).
 *   - Once at target speed AND inside arrivalRadius (1500 units): → 'circularize'.
 *   - Once at target speed but still outside arrivalRadius: → 'align' to coast in.
 *
 * Stations / non-gravity targets:
 *   - Brake until speed < RETROBURN_DONE_SPEED (5 m/s), then → 'done'.
 *
 * Returns the next AutopilotPhase to transition to, or null to stay in 'retroburn'.
 */
export function OrbitInsertion(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    gravBody, dist, speed, noseDir, velFlat, toTarget,
    vToward, distToArrival, arrivalRadius, retroTargetSpeed,
    thrustReverse, yawLeft, yawRight,
    angVel, status,
  } = ctx;

  // Determine target speed: planet-relative value from ctx, or near-zero for stations
  const doneSpeed = gravBody ? retroTargetSpeed : RETROBURN_DONE_SPEED;

  // ── Done braking — decide next phase ───────────────────────────────────────
  if (speed <= doneSpeed) {
    if (gravBody) {
      // At target speed: hand off to circularize if inside arrival radius,
      // else re-align and coast in at controlled speed
      return dist <= arrivalRadius ? 'circularize' : 'align';
    }
    // Station: velocity killed — done if arrived, else re-approach
    if (distToArrival <= 0 || dist < arrivalRadius * 2) return 'done';
    return 'align';
  }

  // ── Still braking — point nose to retrograde and fire ─────────────────────
  const distToArrivalKm = Math.round(distToArrival);
  status.current = `BRAKING  ${Math.round(speed)} m/s → ${Math.round(doneSpeed)} m/s  (${distToArrivalKm > 0 ? distToArrivalKm + ' u' : 'PAST TARGET'})`;

  // True retrograde cancels all velocity. Falls back to anti-target when nearly stopped.
  if (velFlat.lengthSq() > 0.25) {
    _retroDir.copy(velFlat).negate().normalize();
  } else {
    _retroDir.copy(toTarget).negate();
  }

  const crossYRetro = noseDir.x * _retroDir.z - noseDir.z * _retroDir.x;
  const dotRetro    = noseDir.dot(_retroDir);
  const signedErrorRetro = Math.atan2(crossYRetro, dotRetro);
  const { yawLeft: yl, yawRight: yr } = computeYaw(signedErrorRetro, angVel);
  yawLeft.current  = yl;
  yawRight.current = yr;

  if (speed > 1 && Math.abs(signedErrorRetro) < MAX_RETROBURN_ANGLE) {
    thrustReverse.current = true; // aligned to retrograde — burn
  } else if (vToward < -1 && distToArrival > arrivalRadius) {
    return 'align'; // drifting away and far — re-approach
  }

  return null;
}
