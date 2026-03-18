import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';

const _radialBody = new THREE.Vector3();
const _burnDir    = new THREE.Vector3();

/**
 * Handles the 'stabilize-orbit' phase: Hohmann-style burns to circularize
 * the orbit at the planet's ideal orbit radius (surfaceRadius + orbitAltitude).
 * This matches the green orbit ring shown in-game.
 *
 * Sequence (ship coasts between burns — no thrust unless at an apsis):
 *   1. At periapsis → burn to set apoapsis = orbitTarget
 *   2. At apoapsis  → burn to set periapsis = orbitTarget
 *   3. Done when both apsides are within 15% of orbitTarget
 *
 * Each burn computes the exact delta-V needed and stops when |dv| < 1 m/s,
 * preventing overshoot regardless of burn duration.
 *
 * Returns the next AutopilotPhase to transition to, or null to stay in 'stabilize-orbit'.
 */
export function StabilizeOrbit(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    gravBody, shipPos, velFlat, noseDir, orbitStatus,
    vToward,
    thrustReverse, yawLeft, yawRight,
    angVel, status,
  } = ctx;

  if (!gravBody) return 'done';

  // Orbit target = the green ring radius (ideal orbit altitude for this planet)
  const orbitTarget    = gravBody.surfaceRadius + gravBody.orbitAltitude;
  const mu             = gravBody.mu;
  const apsisTolerance = 50; // units — detection window for apsis crossing

  const { periapsis, apoapsis } = orbitStatus;

  // Done when both apsides are within 15% of orbitTarget (nearly circular at target altitude)
  if (
    periapsis > 0 && apoapsis > 0 &&
    Math.abs(periapsis - orbitTarget) / orbitTarget < 0.15 &&
    Math.abs(apoapsis  - orbitTarget) / orbitTarget < 0.15
  ) {
    return 'done';
  }

  const bp = gravBody.position;
  _radialBody.set(shipPos.x - bp.x, 0, shipPos.z - bp.z);
  const r = _radialBody.length();
  _radialBody.normalize();

  // Tangential (prograde) direction, respecting orbit sense
  const angMomY   = (shipPos.x - bp.x) * velFlat.z - (shipPos.z - bp.z) * velFlat.x;
  const orbitSign = angMomY >= 0 ? 1.0 : -1.0;
  const tangX     = -orbitSign * _radialBody.z;
  const tangZ     =  orbitSign * _radialBody.x;

  // Compute exact delta-V needed at the current apsis.
  // At periapsis: target apoapsis = orbitTarget  →  a = (r + orbitTarget) / 2
  // At apoapsis:  target periapsis = orbitTarget  →  a = (orbitTarget + r) / 2
  // In both cases: v_target = sqrt(mu * (2/r − 1/a))
  // dv > 0 → prograde burn;  dv < 0 → retrograde burn
  let dv: number | null = null;
  let burnLabel = '';

  if (periapsis > 0 && Math.abs(r - periapsis) < apsisTolerance && orbitTarget > r) {
    // At periapsis — set apoapsis to orbitTarget
    const a_new    = (r + orbitTarget) / 2;
    const v_target = Math.sqrt(mu * Math.max(0, 2 / r - 1 / a_new));
    dv = v_target - velFlat.length();
    burnLabel = dv >= 0 ? 'RAISING APOAPSIS' : 'LOWERING APOAPSIS';
  } else if (apoapsis > 0 && Math.abs(r - apoapsis) < apsisTolerance && orbitTarget < r) {
    // At apoapsis — set periapsis to orbitTarget
    const a_new    = (orbitTarget + r) / 2;
    const v_target = Math.sqrt(mu * Math.max(0, 2 / r - 1 / a_new));
    dv = v_target - velFlat.length();
    burnLabel = dv >= 0 ? 'RAISING PERIAPSIS' : 'LOWERING PERIAPSIS';
  }

  // Coast when not at an apsis, or when burn is complete (|dv| < 1 m/s)
  if (dv === null || Math.abs(dv) < 1) {
    const { yawLeft: yl, yawRight: yr } = computeYaw(0, angVel);
    yawLeft.current  = yl;
    yawRight.current = yr;
    status.current = vToward > 0
      ? `COASTING TO PERIAPSIS  (${Math.round(periapsis)} u)`
      : `COASTING TO APOAPSIS  (${Math.round(apoapsis > 0 ? apoapsis : 0)} u)`;
    return null;
  }

  status.current = burnLabel;

  // Burn in prograde (dv > 0) or retrograde (dv < 0) direction
  const sign = dv > 0 ? 1 : -1;
  _burnDir.set(tangX * sign, 0, tangZ * sign);

  const crossYBurn    = noseDir.x * _burnDir.z - noseDir.z * _burnDir.x;
  const dotBurn       = noseDir.dot(_burnDir);
  const signedErrorDv = Math.atan2(crossYBurn, dotBurn);
  const { yawLeft: yl, yawRight: yr } = computeYaw(signedErrorDv, angVel);
  yawLeft.current  = yl;
  yawRight.current = yr;

  if (Math.abs(signedErrorDv) < 0.3) thrustReverse.current = true;

  return null;
}
