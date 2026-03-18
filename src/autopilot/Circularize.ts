import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { ORBIT_INSERTION_PERIAPSIS } from './constants';

const _radialBody = new THREE.Vector3();
const _deltaV     = new THREE.Vector3();

/**
 * Handles the 'circularize' phase: orbital insertion burn.
 *
 * Treats the ship's current position as the apoapsis of the insertion ellipse
 * and burns tangentially to achieve a periapsis of ORBIT_INSERTION_PERIAPSIS (1000 units).
 *
 *   a         = (r + r_p) / 2             — semi-major axis
 *   v_insert  = √(μ × (2/r − 1/a))       — speed at apoapsis of insertion ellipse
 *   deltaV    = tangential(v_insert) − current_velocity
 *
 * NOTE: Does NOT check isOrbiting/apsides to exit early. The orbit calculator
 * often reports a bound trajectory the moment the ship arrives with inward velocity,
 * before the insertion burn has started. We always complete the burn first.
 *
 * Transitions to 'stabilize-orbit' when |deltaV| < 1 m/s (burn complete).
 * The ship then coasts unpowered to periapsis; stabilize-orbit waits there
 * to perform the apoapsis-raising burn.
 *
 * Returns the next AutopilotPhase to transition to, or null to stay in 'circularize'.
 */
export function Circularize(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    gravBody, shipPos, velFlat, noseDir,
    thrustReverse, yawLeft, yawRight,
    angVel, status,
  } = ctx;

  if (!gravBody) return 'done';

  const bp = gravBody.position;
  _radialBody.set(shipPos.x - bp.x, 0, shipPos.z - bp.z);
  const r = _radialBody.length();
  _radialBody.normalize();

  // Treat current radius as apoapsis — compute insertion ellipse speed
  const r_p = ORBIT_INSERTION_PERIAPSIS;
  const a   = (r + r_p) / 2;
  const v_insert = Math.sqrt(gravBody.mu * Math.max(0, 2 / r - 1 / a));

  // Tangential direction (perpendicular to radial, matching current orbit sense)
  const angMomY   = (shipPos.x - bp.x) * velFlat.z - (shipPos.z - bp.z) * velFlat.x;
  const orbitSign = angMomY >= 0 ? 1.0 : -1.0;
  const tangX     = -orbitSign * _radialBody.z;
  const tangZ     =  orbitSign * _radialBody.x;

  // deltaV: difference between target insertion velocity and current velocity
  _deltaV.set(tangX * v_insert - velFlat.x, 0, tangZ * v_insert - velFlat.z);
  const dvMag = _deltaV.length();
  if (dvMag < 1) {
    status.current = 'COASTING TO PERIAPSIS';
    return 'stabilize-orbit'; // insertion burn complete — coast to periapsis
  }

  status.current = `INSERTION BURN  ΔV ${Math.round(dvMag)} m/s`;

  _deltaV.normalize();
  const crossYDv      = noseDir.x * _deltaV.z - noseDir.z * _deltaV.x;
  const dotDv         = noseDir.dot(_deltaV);
  const signedErrorDv = Math.atan2(crossYDv, dotDv);
  const { yawLeft: yl, yawRight: yr } = computeYaw(signedErrorDv, angVel);
  yawLeft.current  = yl;
  yawRight.current = yr;

  if (Math.abs(signedErrorDv) < 0.3) thrustReverse.current = true;

  return null;
}
