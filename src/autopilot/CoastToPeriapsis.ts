import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { THRUST, MAX_THRUST_MULTIPLIER } from '../context/ShipState';

const _retroDir = new THREE.Vector3();
const _relVel   = new THREE.Vector3();
const _relPos   = new THREE.Vector3();

/**
 * Handles the 'coast-to-periapsis' phase: no thrust, pre-orient retrograde,
 * wait until far enough before periapsis to begin the capture burn.
 *
 * Periapsis detection: instead of waiting until radialVelocity flips (which
 * means the burn starts AT periapsis and is mostly wasted post-periapsis), we
 * estimate the capture burn time and begin the burn half-a-burn-duration before
 * periapsis so the burn is centred on the periapsis point for maximum Oberth
 * effect.
 *
 * Lead-time calculation:
 *   1. Predict periapsis speed:  v_pe² = v_rel² − 2μ/r + 2μ/r_pe
 *   2. Delta-v needed:           Δv = v_pe − √(μ/r_pe)
 *   3. Burn time at max thrust:  t_burn = Δv / (THRUST × MAX_THRUST_MULTIPLIER)
 *   4. Estimated time to Pe:     t_to_pe = (dist − r_pe) / |rv|  (linear approx)
 *   5. Trigger when:             t_to_pe ≤ t_burn / 2
 *
 * The linear time-to-periapsis estimate is conservative (ship accelerates as it
 * falls, so it actually arrives sooner). This means the trigger fires slightly
 * late, but the burn is still substantially earlier than waiting for rv ≥ 0.
 *
 * Fallback: also triggers at rv ≥ 0 (periapsis passage) in case the lead-time
 * estimate is not computable.
 */
export function CoastToPeriapsis(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    shipPos,
    gravBody,
    dist,
    arrivalRadius,
    orbitStatus,
    noseDir,
    velFlat,
    angVel,
    yawLeft,
    yawRight,
    status,
  } = ctx;

  if (!gravBody) return 'retroburn';

  // Compute planet-relative position and velocity from scratch.
  // orbitStatus.radialVelocity is relative to the current primary gravity body,
  // which is the sun when the ship is outside the target planet's SOI. Using a
  // sun-relative value here would cause the fallback (rv >= 0) to fire immediately
  // if the ship happens to be moving away from the sun at that point in its orbit.
  _relPos.set(shipPos.x - gravBody.position.x, 0, shipPos.z - gravBody.position.z);
  _relVel.set(velFlat.x - gravBody.velocity.x, 0, velFlat.z - gravBody.velocity.z);
  const r_local = _relPos.length();
  const rv = r_local > 1e-6 ? _relVel.dot(_relPos) / r_local : 0;

  const pe = orbitStatus.hyperbolicPeriapsis ?? 0;

  status.current =
    pe > 0 ? `COASTING TO PERIAPSIS  (Pe ~${Math.round(pe)} u)` : `COASTING TO PERIAPSIS`;

  // Pre-orient nose to planet-relative retrograde during coast so we can fire
  // immediately when the capture burn begins.
  if (_relVel.lengthSq() > 0.25) {
    _retroDir.copy(_relVel).negate().normalize();
    const crossY = noseDir.x * _retroDir.z - noseDir.z * _retroDir.x;
    const { yawLeft: yl, yawRight: yr } = computeYaw(
      Math.atan2(crossY, noseDir.dot(_retroDir)),
      angVel
    );
    yawLeft.current = yl;
    yawRight.current = yr;
  }

  // ── Lead-time trigger: start burn before periapsis ────────────────────────
  if (rv < 0 && gravBody.mu > 0) {
    const mu   = gravBody.mu;
    const r_pe = arrivalRadius;
    const v_sq = _relVel.lengthSq();

    // Speed at periapsis predicted by energy conservation (coast = no thrust)
    const v_pe_sq = Math.max(0, v_sq - 2 * mu / dist + 2 * mu / r_pe);
    const v_pe    = Math.sqrt(v_pe_sq);
    const v_circ  = Math.sqrt(mu / r_pe);

    // Delta-v and burn time at maximum thrust
    const deltaV   = Math.max(0, v_pe - v_circ);
    const burnTime = deltaV / (THRUST * MAX_THRUST_MULTIPLIER);

    // Estimated time to periapsis (linear; conservative — ship actually arrives sooner)
    const approachRate = -rv; // rv < 0, so this is positive
    const distToPe     = Math.max(0, dist - r_pe);
    const timeToPe     = approachRate > 0.1 ? distToPe / approachRate : Infinity;

    // Begin capture burn so the midpoint of the burn falls near periapsis
    if (timeToPe <= burnTime / 2) {
      return 'hyperbolic-capture';
    }
  }

  // Fallback: periapsis passage detected (planet-relative rv flipped positive)
  // or well inside arrival radius
  if (rv >= 0 || dist <= arrivalRadius * 0.5) {
    return gravBody ? 'hyperbolic-capture' : 'retroburn';
  }

  return null;
}
