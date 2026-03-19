import * as THREE from 'three';
import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { ORBIT_INSERTION_PERIAPSIS } from './constants';
import { trajectoryApsisRef } from '../context/ShipState';

const _radialBody = new THREE.Vector3();
const _deltaV = new THREE.Vector3();

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
 * Exits early to 'stabilize-orbit' if the orbit calculator already reports a valid
 * bound orbit (isOrbiting true, both apsides > 0). Otherwise burns until |deltaV| < 1 m/s.
 * The ship then coasts unpowered to periapsis; stabilize-orbit waits there
 * to perform the apoapsis-raising burn.
 *
 * Returns the next AutopilotPhase to transition to, or null to stay in 'circularize'.
 */
export function Circularize(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    gravBody,
    shipPos,
    velFlat,
    noseDir,
    thrustReverse,
    yawLeft,
    yawRight,
    angVel,
    status,
    orbitStatus,
  } = ctx;

  if (!gravBody) return 'done';

  // If orbit is already established (both apsides computed and above surface), stop burning.
  if (orbitStatus.isOrbiting && orbitStatus.periapsis > 0 && orbitStatus.apoapsis > 0) {
    status.current = 'ORBIT ESTABLISHED';
    return 'stabilize-orbit';
  }

  const bp = gravBody.position;
  _radialBody.set(shipPos.x - bp.x, 0, shipPos.z - bp.z);
  const r = _radialBody.length();
  _radialBody.normalize();

  // Treat current radius as apoapsis — compute insertion ellipse speed.
  // For small planets the ideal orbit radius may be well below ORBIT_INSERTION_PERIAPSIS,
  // so clamp r_p to the planet's own ideal orbit altitude to keep periapsis < apoapsis.
  const r_p = Math.min(ORBIT_INSERTION_PERIAPSIS, gravBody.surfaceRadius + gravBody.orbitAltitude);
  const a = (r + r_p) / 2;
  const v_insert = Math.sqrt(gravBody.mu * Math.max(0, 2 / r - 1 / a));

  // Tangential direction (perpendicular to radial, matching current orbit sense)
  const angMomY = (shipPos.x - bp.x) * velFlat.z - (shipPos.z - bp.z) * velFlat.x;
  const orbitSign = angMomY >= 0 ? 1.0 : -1.0;
  const tangX = -orbitSign * _radialBody.z;
  const tangZ = orbitSign * _radialBody.x;

  // Orbital display info — uses trajectory-simulated apsides (same values as the Pe/Ap markers
  // on the trajectory line), which work even on hyperbolic approaches before orbit is established.
  const currentAlt = Math.round(r - gravBody.surfaceRadius);
  const targetAlt = Math.round(gravBody.orbitAltitude);
  const traj = trajectoryApsisRef.current;
  const sr = traj.surfaceRadius > 0 ? traj.surfaceRadius : gravBody.surfaceRadius;
  const peAlt = traj.periapsis > 0 ? Math.round(traj.periapsis - sr) : '—';
  const apAlt = traj.apoapsis > 0 ? Math.round(traj.apoapsis - sr) : '—';
  const orbitInfo = `  ALT: ${currentAlt}  Pe: ${peAlt} [${targetAlt}]  Ap: ${apAlt} [${targetAlt}]`;

  // deltaV: difference between target insertion velocity and current velocity
  _deltaV.set(tangX * v_insert - velFlat.x, 0, tangZ * v_insert - velFlat.z);
  const dvMag = _deltaV.length();
  if (dvMag < 1) {
    status.current = `COASTING TO PERIAPSIS${orbitInfo}`;
    return 'stabilize-orbit'; // insertion burn complete — coast to periapsis
  }

  status.current = `INSERTION BURN  ΔV ${Math.round(dvMag)} m/s${orbitInfo}`;

  _deltaV.normalize();
  const crossYDv = noseDir.x * _deltaV.z - noseDir.z * _deltaV.x;
  const dotDv = noseDir.dot(_deltaV);
  const signedErrorDv = Math.atan2(crossYDv, dotDv);
  const { yawLeft: yl, yawRight: yr } = computeYaw(signedErrorDv, angVel);
  yawLeft.current = yl;
  yawRight.current = yr;

  if (Math.abs(signedErrorDv) < 0.3) thrustReverse.current = true;

  return null;
}
