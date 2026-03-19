import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { MAX_RETROBURN_ANGLE } from './constants';

// Scratch vectors — reused every frame to avoid allocations
const _retroDir  = new THREE.Vector3();
const _relVel    = new THREE.Vector3();

// Tolerance band for "close enough to ideal orbit"
const ORBIT_TOLERANCE = 0.10; // 10 %

// Hand off to stabilize-orbit once apoapsis is within this multiple of
// orbit_target — avoids a very long retro-burn on eccentric orbits.
const STABILIZE_HANDOFF = 5.0; // apoapsis < 5× orbit_target → fine-tune

/**
 * Handles the 'hyperbolic-capture' phase.
 *
 * Fires at periapsis (after the hyperbolic coast) to capture the ship into
 * a bound orbit, then continues retro-burning to reduce apoapsis until both
 * apsides are within 10 % of the ideal orbit radius (the green ring).
 *
 *   v_capture = retrograde burn from hyperbolic periapsis speed down toward
 *               circular orbital speed at r_p
 *
 * Done condition (10 % tolerance):
 *   |Pe − orbit_target| / orbit_target ≤ 0.10
 *   |Ap − orbit_target| / orbit_target ≤ 0.10
 *
 * If orbit is established (energy < 0) but apoapsis is still large, keep
 * burning.  Once apoapsis falls inside STABILIZE_HANDOFF × orbit_target,
 * delegate to 'stabilize-orbit' for precise Hohmann tune-up if still needed,
 * or exit to 'done' if already within tolerance.
 *
 * Velocity is measured in the planet's reference frame so the burn is
 * correct regardless of the planet's own orbital speed around the sun.
 */
export function HyperbolicCapture(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    gravBody, velFlat, noseDir, angVel,
    orbitStatus, thrustReverse, yawLeft, yawRight, status,
  } = ctx;

  if (!gravBody) return 'done';

  const orbit_target = gravBody.surfaceRadius + gravBody.orbitAltitude;
  const { isOrbiting, periapsis, apoapsis } = orbitStatus;

  // ── Check completion ──────────────────────────────────────────────────────
  if (isOrbiting && periapsis > 0 && apoapsis > 0) {
    const peErr = Math.abs(periapsis - orbit_target) / orbit_target;
    const apErr = Math.abs(apoapsis  - orbit_target) / orbit_target;

    if (peErr <= ORBIT_TOLERANCE && apErr <= ORBIT_TOLERANCE) {
      return 'done';
    }

    // Apoapsis has come down to a manageable range → hand off to Hohmann tuner
    if (apoapsis <= orbit_target * STABILIZE_HANDOFF) {
      return 'stabilize-orbit';
    }
  }

  // ── Planet-relative retrograde direction ──────────────────────────────────
  _relVel.set(
    velFlat.x - gravBody.velocity.x,
    0,
    velFlat.z - gravBody.velocity.z,
  );

  if (_relVel.lengthSq() < 0.25) {
    // Essentially stationary relative to planet — nothing more to burn
    return 'stabilize-orbit';
  }

  _retroDir.copy(_relVel).negate().normalize();

  // ── Yaw to retrograde ─────────────────────────────────────────────────────
  const crossY = noseDir.x * _retroDir.z - noseDir.z * _retroDir.x;
  const signedError = Math.atan2(crossY, noseDir.dot(_retroDir));
  const { yawLeft: yl, yawRight: yr } = computeYaw(signedError, angVel);
  yawLeft.current  = yl;
  yawRight.current = yr;

  // ── Burn once aligned ─────────────────────────────────────────────────────
  if (Math.abs(signedError) < MAX_RETROBURN_ANGLE) {
    thrustReverse.current = true;
  }

  // ── Status ────────────────────────────────────────────────────────────────
  const peStr = periapsis > 0 ? `Pe ${Math.round(periapsis)}`  : 'Pe —';
  const apStr = apoapsis  > 0 ? `Ap ${Math.round(apoapsis)}`   : 'Ap (unbound)';
  status.current = `CAPTURE BURN  ${peStr} / ${apStr}  → [${Math.round(orbit_target)}]`;

  return null;
}
