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
 *   1. At periapsis → burn prograde to raise apoapsis to orbitTarget
 *   2. At new apoapsis (orbitTarget) → burn prograde to raise periapsis to orbitTarget
 *   3. Done when both apsides are within 50 units of orbitTarget
 *
 * delta-V direction is pure prograde (raise) or retrograde (lower) — a unit
 * vector along the tangential direction. The magnitude is left to the thrust
 * controller; we just point and fire until the orbit reaches target.
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
  const orbitTarget   = gravBody.surfaceRadius + gravBody.orbitAltitude;
  const apsisTolerance = 50; // units — detection window for "am I at periapsis/apoapsis?"

  const { periapsis, apoapsis } = orbitStatus;
  // Orbit established when periapsis and apoapsis are within 10% of the target radius —
  // i.e. a nearly-circular orbit at roughly the right altitude.
  if (periapsis > 0 && apoapsis > 0 && (apoapsis - periapsis) < 0.10 * orbitTarget) {
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

  // Only burn when within apsisTolerance of periapsis or apoapsis
  let prograde: boolean | null = null;
  let burnLabel = '';
  if (Math.abs(r - periapsis) < apsisTolerance) {
    // At periapsis: burn prograde to raise apoapsis, retrograde to lower it
    prograde  = apoapsis < orbitTarget;
    burnLabel = prograde ? 'RAISING APOAPSIS' : 'LOWERING APOAPSIS';
  } else if (Math.abs(r - apoapsis) < apsisTolerance) {
    // At apoapsis: burn prograde to raise periapsis, retrograde to lower it
    prograde  = periapsis < orbitTarget;
    burnLabel = prograde ? 'RAISING PERIAPSIS' : 'LOWERING PERIAPSIS';
  }

  if (prograde === null) {
    // Coasting — damp any residual rotation with minor thruster bursts
    const { yawLeft: yl, yawRight: yr } = computeYaw(0, angVel);
    yawLeft.current  = yl;
    yawRight.current = yr;
    status.current = vToward > 0
      ? `COASTING TO PERIAPSIS  (${Math.round(periapsis)} u)`
      : `COASTING TO APOAPSIS  (${Math.round(apoapsis > 0 ? apoapsis : 0)} u)`;
    return null;
  }

  status.current = burnLabel;

  // Pure prograde or retrograde burn direction (unit tangential vector)
  const sign = prograde ? 1 : -1;
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
