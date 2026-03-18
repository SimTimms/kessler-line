import type { AutopilotCtx, AutopilotPhase } from './types';
import { computeYaw } from './computeYaw';
import { THRUST, MAX_THRUST_MULTIPLIER } from '../context/ShipState';

// Max deceleration available (used for brake-distance calculation)
const A_MAX = THRUST * MAX_THRUST_MULTIPLIER;

/**
 * Handles the 'burn' phase: approach the target.
 *
 * Gravity-body targets (planets):
 *   - Fly straight at the planet center at full thrust.
 *   - Compute the brake distance needed to arrive at arrivalRadius
 *     (1500 units) doing exactly PLANET_RETRO_ARRIVAL_SPEED (100 m/s).
 *   - Flip to 'retroburn' as soon as that brake distance is reached.
 *
 * Non-gravity targets (stations):
 *   - Aim at target, fire approach thrust, flip to 'retroburn' on arrival.
 *
 * Returns the next AutopilotPhase to transition to, or null to stay in 'burn'.
 */
export function Approach(ctx: AutopilotCtx): AutopilotPhase | null {
  const {
    noseDir, toTarget, velFlat,
    dist, distToArrival, speed,
    gravBody, retroTargetSpeed,
    thrustReverse,
    yawLeft, yawRight,
    angVel,
  } = ctx;

  // ── Gravity-body approach: straight at planet center, max thrust ─────────
  if (gravBody) {
    // Yaw straight toward planet center (no orbital tangent blending)
    const crossY = noseDir.x * toTarget.z - noseDir.z * toTarget.x;
    const { yawLeft: yl, yawRight: yr } = computeYaw(Math.atan2(crossY, noseDir.dot(toTarget)), angVel);
    yawLeft.current  = yl;
    yawRight.current = yr;

    // Brake-distance trigger: start retroburn when we can no longer decelerate
    // to retroTargetSpeed before reaching the arrival radius.
    //   d_brake = (v² - v_target²) / (2 * a_max)
    const brakeDist = speed > retroTargetSpeed
      ? (speed * speed - retroTargetSpeed * retroTargetSpeed) / (2 * A_MAX)
      : 0;

    if (distToArrival <= brakeDist) return 'retroburn';

    // Still have room — full thrust toward planet
    const dotAim = noseDir.dot(toTarget);
    if (dotAim > 0.95) thrustReverse.current = true; // only thrust once reasonably aligned
    return null;
  }

  // ── Station approach: aim at target, approach, retroburn at arrival ───────
  const crossYAim = noseDir.x * toTarget.z - noseDir.z * toTarget.x;
  const { yawLeft: yl, yawRight: yr } = computeYaw(Math.atan2(crossYAim, noseDir.dot(toTarget)), angVel);
  yawLeft.current  = yl;
  yawRight.current = yr;

  if (distToArrival <= 0) return 'retroburn';

  // Suppress thrust from `velFlat` perpendicular component (match straight approach)
  const dotNoseTarget = noseDir.x * toTarget.x + noseDir.z * toTarget.z;
  if (dotNoseTarget > 0.95) thrustReverse.current = true;
  return null;
}
