import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import {
  FAST_TRAVEL_CREW_RISK_SPEED,
  FAST_TRAVEL_DEATH_SPEED,
  FAST_TRAVEL_ENGINE_CUTOFF_SPEED,
  NORMAL_TRAVEL_ENTRY_BRAKE_ACCEL,
} from '../../config/fastTravelConfig';
import { pushAlert } from '../../context/AlertsStore';
import {
  normalTravelEntryBrakeTargetRef,
  normalTravelEntryBrakingRef,
  updateFastTravelMembership,
} from '../../context/FastTravelZones';
import { cinematicThrustForward, cinematicThrustReverse } from '../../context/PlayerShipState';
import type { VesselRuntimeState } from '../../context/VesselStateStore';
import { triggerShipDestruction } from './destruction';

/** Avoid re-pushing the red crew-risk alert every frame while overspeed persists. */
const crewRiskAlertActiveRef = { current: false };
const _cutoffForward = new THREE.Vector3();
const CUTOFF_SPEED_SQ = FAST_TRAVEL_ENGINE_CUTOFF_SPEED * FAST_TRAVEL_ENGINE_CUTOFF_SPEED;

/**
 * Resolve zone membership for this frame. Crossing into mid/inner bands
 * arms staged entry braking (see {@link applyNormalTravelEntryBrake}).
 */
export function applyFastTravelZoneUpdate(shipPos: THREE.Vector3): number {
  const { nextMultiplier } = updateFastTravelMembership(shipPos);
  return nextMultiplier;
}

/**
 * While entry braking is armed, apply reverse acceleration along velocity
 * until speed is at or below the current staged target.
 * Call after the physics integrate so player thrust cannot undo the shed
 * on the same frame.
 */
export function applyNormalTravelEntryBrake(
  velocity: MutableRefObject<THREE.Vector3>,
  dt: number
): void {
  const target = normalTravelEntryBrakeTargetRef.current;
  if (target <= 0 || dt <= 0) {
    normalTravelEntryBrakingRef.current = false;
    return;
  }

  const speed = velocity.current.length();
  if (speed <= target) {
    normalTravelEntryBrakeTargetRef.current = 0;
    normalTravelEntryBrakingRef.current = false;
    return;
  }

  const excess = speed - target;
  const reduce = Math.min(excess, NORMAL_TRAVEL_ENTRY_BRAKE_ACCEL * dt);
  velocity.current.multiplyScalar((speed - reduce) / speed);

  if (speed - reduce <= target) {
    normalTravelEntryBrakeTargetRef.current = 0;
    normalTravelEntryBrakingRef.current = false;
  }
}

/**
 * At {@link FAST_TRAVEL_ENGINE_CUTOFF_SPEED}, block longitudinal thrust that
 * would further increase speed. Decelerating thrust in the opposite direction
 * remains available.
 *
 * Convention matches {@link applyPhysicsStep}: `fwd` adds −localForward,
 * `rev` adds +localForward.
 */
export function gateLongitudinalThrustForOverspeed(
  velocity: THREE.Vector3,
  shipQuaternion: THREE.Quaternion,
  fwd: boolean,
  rev: boolean
): { fwd: boolean; rev: boolean } {
  if (velocity.lengthSq() < CUTOFF_SPEED_SQ) {
    return { fwd, rev };
  }

  _cutoffForward.set(0, 0, 1).applyQuaternion(shipQuaternion);
  const alongAft = velocity.dot(_cutoffForward);

  let nextFwd = fwd;
  let nextRev = rev;
  // Flying nose-first (along −forward): block main-engine `fwd`.
  if (fwd && alongAft < 0) nextFwd = false;
  // Flying aft-first (along +forward): block reverse-thruster `rev`.
  if (rev && alongAft > 0) nextRev = false;

  return { fwd: nextFwd, rev: nextRev };
}

/**
 * Overspeed hazards: red "Risk to Crew" above the warning threshold, and
 * ship destruction at the fatal threshold (triggers DeathOverlay).
 */
export function applyFastTravelSpeedHazards(
  velocity: MutableRefObject<THREE.Vector3>,
  vesselId: string,
  vesselState: VesselRuntimeState,
  publishToPlayerRefs: boolean
): void {
  if (vesselState.shipDestroyed.current) return;

  const speed = velocity.current.length();

  if (speed >= FAST_TRAVEL_DEATH_SPEED) {
    crewRiskAlertActiveRef.current = false;
    triggerShipDestruction({
      vesselId,
      vesselState,
      cause: 'speed',
      cinematicThrustForwardRef: publishToPlayerRefs ? cinematicThrustForward : undefined,
      cinematicThrustReverseRef: publishToPlayerRefs ? cinematicThrustReverse : undefined,
    });
    return;
  }

  if (speed > FAST_TRAVEL_CREW_RISK_SPEED) {
    if (!crewRiskAlertActiveRef.current) {
      crewRiskAlertActiveRef.current = true;
      pushAlert('Risk to Crew', 'red');
    }
  } else if (crewRiskAlertActiveRef.current) {
    crewRiskAlertActiveRef.current = false;
  }
}
