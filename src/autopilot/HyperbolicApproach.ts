import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { THRUST, MAX_THRUST_MULTIPLIER } from '../context/ShipState';

// Scratch vectors — reused every frame to avoid allocations
const _rRel = new THREE.Vector3();
const _vRel = new THREE.Vector3();
const _toAim = new THREE.Vector3();

// Orbit side — locked on first call, never flipped mid-approach.
// Flipping mid-approach mirrors the aim point to the other side of the planet,
// instantly creating a large heading error and causing engine oscillation.
let _orbitSign = 1.0;
let _orbitSignLocked = false;

/** Call when starting a fresh hyperbolic-approach to reset the locked side. */
export function resetHyperbolicApproach() {
  _orbitSignLocked = false;
  _log.thrust  = false;
  _log.yawDir  = 0;
  _log.phi_deg = -999;
}

// ── Debug logging ────────────────────────────────────────────────────────────
const _log = {
  thrust:  false,
  yawDir:  0,       // -1 = left, 0 = none, +1 = right
  phi_deg: -999,    // last logged heading angle
};

function hlog(msg: string, color = '#aaffcc') {
  // eslint-disable-next-line no-console
  console.log(`%c[HA] ${msg}`, `color:${color};font-weight:bold`);
}

/**
 * Handles the 'hyperbolic-approach' phase.
 *
 * Steers the ship onto a hyperbolic trajectory whose periapsis equals the
 * ideal orbit radius (the green ring).
 *
 * Strategy — heading-angle steering (stable):
 *   1. Compute the required impact parameter b for the desired periapsis r_p:
 *        b = r_p × √(1 + 2μ / (r_p × v∞²))
 *      where v∞² = v² − 2μ/r  (excess velocity squared)
 *   2. Compute the required heading angle φ off the ship→planet direction:
 *        sin(φ) = b × v∞ / (r × v)
 *      This is the angle the ship must fly at to achieve periapsis r_p.
 *   3. Place the aim point far away in the direction (cos φ · r̂ + sin φ · ⊥r̂).
 *      Unlike the old approach (aim = planet + perp(velocity) × b), this aim
 *      point is stable — it only shifts as the ship moves, not as it yaws.
 *      Steering toward it converges without rotating-aim-point instability.
 *
 * Transitions:
 *   → 'coast-to-periapsis'  once inside the SOI (gravity does the rest)
 *   → 'burn'                if no gravity body (should not happen; safety)
 */
export function HyperbolicApproach(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    shipPos,
    velFlat,
    gravBody,
    noseDir,
    angVel,
    dist,
    orbitStatus,
    yawLeft,
    yawRight,
    thrustReverse,
    status,
  } = ctx;

  if (!gravBody) return 'burn';

  const mu  = gravBody.mu;
  const r_p = gravBody.surfaceRadius + gravBody.orbitAltitude;
  const bp  = gravBody.position;

  // ── Planet-relative position and velocity (XZ plane) ─────────────────────
  _rRel.set(shipPos.x - bp.x, 0, shipPos.z - bp.z);
  _vRel.set(velFlat.x - gravBody.velocity.x, 0, velFlat.z - gravBody.velocity.z);

  const r    = _rRel.length();
  const v_sq = _vRel.x * _vRel.x + _vRel.z * _vRel.z;
  if (r < 1 || v_sq < 0.01) return null;
  const v = Math.sqrt(v_sq);

  // ── Transition: start coast/capture sequence when burn lead-time is reached ─
  // Don't wait for SOI entry — a fast approach from far out needs to begin
  // orienting and burning well before the SOI boundary.
  //
  // Lead-time calculation (same as CoastToPeriapsis):
  //   v_pe² = v² − 2μ/r + 2μ/r_p   (energy conservation to periapsis)
  //   Δv    = v_pe − √(μ/r_p)       (speed reduction needed)
  //   t_burn = Δv / (THRUST × MAX_THRUST_MULTIPLIER)
  //   t_to_pe = (r − r_p) / |rv|    (linear time-to-periapsis estimate)
  //   → transition when t_to_pe ≤ t_burn   (full burn-time of lead, not half,
  //     so CoastToPeriapsis has time to finish reorienting before burn starts)
  {
    const rv_now = _vRel.dot(_rRel) / Math.max(r, 1); // planet-relative radial vel
    if (rv_now < 0) {
      const v_pe_sq  = Math.max(0, v_sq - 2 * mu / r + 2 * mu / r_p);
      const deltaV   = Math.max(0, Math.sqrt(v_pe_sq) - Math.sqrt(mu / r_p));
      const burnTime = deltaV / (THRUST * MAX_THRUST_MULTIPLIER);
      const distToPe = Math.max(0, r - r_p);
      const timeToPe = (-rv_now) > 0.1 ? distToPe / (-rv_now) : Infinity;
      if (timeToPe <= burnTime) return 'coast-to-periapsis';
    }
  }

  // Fallback: inside SOI — coast regardless of lead-time calculation
  if (dist <= gravBody.soiRadius) return 'coast-to-periapsis';

  // ── Lock orbit side on first call ─────────────────────────────────────────
  // We commit once and never flip. Flipping mid-approach mirrors the aim point
  // across the planet, causing a sudden large heading error → engine oscillation.
  if (!_orbitSignLocked) {
    const h_scalar = _rRel.x * _vRel.z - _rRel.z * _vRel.x;
    // Use angular momentum sign if clearly non-zero (> 1% of r×v),
    // otherwise keep the default +1 (arbitrary but stable for radial starts).
    if (Math.abs(h_scalar) > r * v * 0.01) {
      _orbitSign = h_scalar > 0 ? 1.0 : -1.0;
    }
    _orbitSignLocked = true;
    hlog(
      `orbitSign LOCKED ${_orbitSign > 0 ? '+1(CCW)' : '-1(CW)'}` +
      `  |h|=${Math.round(Math.abs(h_scalar))}  r=${Math.round(r)}  v=${Math.round(v)}`,
      '#ffcc44',
    );
  }
  const orbitSign = _orbitSign;

  // ── Impact parameter for the desired periapsis ────────────────────────────
  // v∞² = v² − 2μ/r  (excess energy; clamp to small positive)
  const v_inf_sq = Math.max(0.01, v_sq - (2 * mu) / r);
  const v_inf    = Math.sqrt(v_inf_sq);
  // b = r_p × √(1 + 2μ / (r_p × v∞²))
  const b_target = r_p * Math.sqrt(1 + (2 * mu) / (r_p * v_inf_sq));

  // ── Required heading angle φ off the ship→planet direction ───────────────
  // h_desired = b × v∞  (angular momentum magnitude needed for periapsis r_p)
  // sin(φ)    = h_desired / (r × v)
  // The ship needs to fly at angle φ off the direct planet direction.
  const h_desired = b_target * v_inf;
  const sin_phi   = Math.min(1.0, h_desired / (r * v));
  const cos_phi   = Math.sqrt(Math.max(0, 1 - sin_phi * sin_phi));
  const phi_deg   = Math.asin(sin_phi) * 180 / Math.PI;

  // ── Stable aim point: far away in the desired heading direction ───────────
  // r̂ = unit vector from ship toward planet
  // ⊥r̂ = 90° CCW of r̂ in XZ: (x,z) → (-z, x)
  // heading = cos(φ)·r̂ + sin(φ)·orbitSign·⊥r̂
  // Aim point = shipPos + large_dist × heading
  // This aim point only shifts as the ship moves, not as it yaws — stable.
  const r_hat_x  = -_rRel.x / r;               // toward planet
  const r_hat_z  = -_rRel.z / r;
  const perp_r_x = -r_hat_z;                   // 90° CCW of r̂ in XZ
  const perp_r_z =  r_hat_x;

  const heading_x = cos_phi * r_hat_x + sin_phi * orbitSign * perp_r_x;
  const heading_z = cos_phi * r_hat_z + sin_phi * orbitSign * perp_r_z;

  const AIM_DIST = Math.max(r * 2, 500);
  const aimX = shipPos.x + heading_x * AIM_DIST;
  const aimZ = shipPos.z + heading_z * AIM_DIST;

  // ── Status display ────────────────────────────────────────────────────────
  const predictedPe = orbitStatus.hyperbolicPeriapsis ?? 0;
  const peStr =
    predictedPe > 0
      ? `Pe ~${Math.round(predictedPe)} [${Math.round(r_p)}]`
      : `target Pe ${Math.round(r_p)}`;
  status.current = `HYPERBOLIC APPROACH  ${peStr}`;

  // ── Steer toward aim point ────────────────────────────────────────────────
  _toAim.set(aimX - shipPos.x, 0, aimZ - shipPos.z);
  if (_toAim.length() < 0.1) return null;
  _toAim.normalize();

  const crossY      = noseDir.x * _toAim.z - noseDir.z * _toAim.x;
  const signedError = Math.atan2(crossY, noseDir.dot(_toAim));
  const { yawLeft: yl, yawRight: yr } = computeYaw(signedError, angVel);
  yawLeft.current  = yl;
  yawRight.current = yr;

  // ── Log heading angle changes (every 2°) ─────────────────────────────────
  if (Math.abs(phi_deg - _log.phi_deg) >= 2) {
    hlog(
      `φ=${phi_deg.toFixed(1)}°  b=${Math.round(b_target)}  v∞=${v_inf.toFixed(1)}` +
      `  r=${Math.round(r)}  v=${Math.round(v)}  sin_φ=${sin_phi.toFixed(3)}`,
      '#ccaaff',
    );
    _log.phi_deg = phi_deg;
  }

  // ── Log yaw decision changes ──────────────────────────────────────────────
  const newYawDir = yl ? -1 : yr ? 1 : 0;
  if (newYawDir !== _log.yawDir) {
    const errDeg = (signedError * 180 / Math.PI).toFixed(1);
    if (newYawDir === 0) {
      hlog(`yaw STOP  err=${errDeg}°  angVel=${angVel.toFixed(3)}`, '#88ccff');
    } else {
      hlog(`yaw ${newYawDir < 0 ? 'LEFT ←' : 'RIGHT →'}  err=${errDeg}°  angVel=${angVel.toFixed(3)}`, '#88ccff');
    }
    _log.yawDir = newYawDir;
  }

  // ── Approach burn — fire when aligned with desired heading ────────────────
  const shouldThrust = Math.abs(signedError) < 0.35;
  if (shouldThrust) thrustReverse.current = true;

  // ── Log thrust changes ────────────────────────────────────────────────────
  if (shouldThrust !== _log.thrust) {
    const errDeg = (signedError * 180 / Math.PI).toFixed(1);
    const pe     = Math.round(orbitStatus.hyperbolicPeriapsis ?? 0);
    if (shouldThrust) {
      hlog(`ENGINE ON   err=${errDeg}°  Pe~${pe}  φ=${phi_deg.toFixed(1)}°  b=${Math.round(b_target)}  v∞=${v_inf.toFixed(1)}`, '#44ff88');
    } else {
      hlog(`ENGINE OFF  err=${errDeg}°  Pe~${pe}  φ=${phi_deg.toFixed(1)}°  b=${Math.round(b_target)}  v∞=${v_inf.toFixed(1)}`, '#ff8844');
    }
    _log.thrust = shouldThrust;
  }

  return null;
}
