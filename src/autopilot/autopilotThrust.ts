import { THRUST, MAX_THRUST_MULTIPLIER } from '../context/ShipState';
import {
  RETROBURN_DONE_SPEED,
  PLANET_RETRO_ARRIVAL_SPEED,
  THRUST_PRECISION,
  THRUST_DIST_FAR,
  THRUST_DIST_MID,
  THRUST_DIST_NEAR,
  THRUST_FAR,
  THRUST_MID,
  THRUST_NEAR,
} from './constants';

/**
 * Returns the desired thrustMultiplier for the current frame.
 *
 * retroburn   — scales thrust to arrive at the target radius at retroTargetSpeed
 * circularize — precision only
 * otherwise   — distance-based stepped scaling
 *
 * retroTargetSpeed: desired speed at arrival (0 for stations, 100 for planets)
 */
export function autopilotThrust(
  dist: number,
  phase: string,
  speed: number,
  distToArrival: number,
  retroTargetSpeed = 0,
): number {
  if (phase === 'retroburn') {
    const doneSpeed = Math.max(RETROBURN_DONE_SPEED, retroTargetSpeed);
    if (speed <= doneSpeed) return THRUST_PRECISION;
    if (distToArrival <= 0) return MAX_THRUST_MULTIPLIER;
    // Thrust needed to decelerate from `speed` to `retroTargetSpeed` over `distToArrival`
    const aNeeded = (speed * speed - retroTargetSpeed * retroTargetSpeed) / (2 * distToArrival);
    return Math.max(THRUST_PRECISION, Math.min(aNeeded / THRUST, MAX_THRUST_MULTIPLIER));
  }

  if (phase === 'circularize')        return THRUST_PRECISION;
  if (phase === 'hyperbolic-capture') return MAX_THRUST_MULTIPLIER;

  let raw: number;
  if      (dist > THRUST_DIST_FAR)  raw = THRUST_FAR;
  else if (dist > THRUST_DIST_MID)  raw = THRUST_MID;
  else if (dist > THRUST_DIST_NEAR) raw = THRUST_NEAR;
  else                               raw = THRUST_PRECISION;
  return Math.min(raw, MAX_THRUST_MULTIPLIER);
}
