import * as THREE from 'three';
import {
  FAST_TRAVEL_MAX_THRUST_MULTIPLIER,
  FAST_TRAVEL_THRUST_MULTIPLIER,
  NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED,
  NORMAL_TRAVEL_OUTER_ENTRY_MAX_SPEED,
  NORMAL_TRAVEL_THRUST_MULTIPLIER,
} from '../config/fastTravelConfig';
import { pushAlert } from './AlertsStore';

/**
 * A spherical (XZ) normal-travel pocket. Outer radius is the full pocket;
 * the inner band starts at half that radius.
 */
export interface NormalTravelZone {
  id: string;
  /** Simulation-space centre (mutable — scenes may update each frame). */
  center: THREE.Vector3;
  /** Outer radius: outside this is full fast travel. */
  radius: number;
}

/** Travel band relative to registered normal-travel pockets. */
export type TravelBand = 'inner' | 'mid' | 'fast';

const zones = new Map<string, NormalTravelZone>();

/** Live thrust scale applied by ship physics (1 when inactive / in inner core). */
export const fastTravelThrustMultiplierRef: { current: number } = {
  current: NORMAL_TRAVEL_THRUST_MULTIPLIER,
};

/** True while the ship is fully outside all normal pockets (full FT). */
export const inFastTravelZoneRef: { current: boolean } = { current: false };

/** Current band: inner core, mid (half FT), or full fast travel. */
export const travelBandRef: { current: TravelBand } = { current: 'inner' };

/**
 * When > 0, entry braking is active and sheds speed down to this target (m/s).
 */
export const normalTravelEntryBrakeTargetRef: { current: number } = { current: 0 };

/** @deprecated Use {@link normalTravelEntryBrakeTargetRef} (> 0 means braking). */
export const normalTravelEntryBrakingRef: { current: boolean } = { current: false };

export function registerNormalTravelZone(zone: NormalTravelZone): void {
  zones.set(zone.id, zone);
}

export function unregisterNormalTravelZone(id: string): void {
  zones.delete(id);
}

export function clearNormalTravelZones(): void {
  zones.clear();
  fastTravelThrustMultiplierRef.current = NORMAL_TRAVEL_THRUST_MULTIPLIER;
  inFastTravelZoneRef.current = false;
  travelBandRef.current = 'inner';
  normalTravelEntryBrakeTargetRef.current = 0;
  normalTravelEntryBrakingRef.current = false;
}

export function getNormalTravelZones(): readonly NormalTravelZone[] {
  return Array.from(zones.values());
}

function clampZoneMultiplier(value: number): number {
  return THREE.MathUtils.clamp(value, NORMAL_TRAVEL_THRUST_MULTIPLIER, FAST_TRAVEL_MAX_THRUST_MULTIPLIER);
}

function halfFastTravelMultiplier(): number {
  return clampZoneMultiplier(FAST_TRAVEL_THRUST_MULTIPLIER * 0.5);
}

function fullFastTravelMultiplier(): number {
  return clampZoneMultiplier(FAST_TRAVEL_THRUST_MULTIPLIER);
}

function multiplierForBand(band: TravelBand): number {
  if (band === 'fast') return fullFastTravelMultiplier();
  if (band === 'mid') return halfFastTravelMultiplier();
  return NORMAL_TRAVEL_THRUST_MULTIPLIER;
}

/**
 * Resolve the ship's travel band against all registered pockets.
 * Prefer the most restrictive (inner > mid > fast) if multiple overlap.
 */
export function resolveTravelBand(shipPos: THREE.Vector3): TravelBand {
  if (zones.size === 0) return 'inner';

  let band: TravelBand = 'fast';
  for (const zone of zones.values()) {
    const dx = shipPos.x - zone.center.x;
    const dz = shipPos.z - zone.center.z;
    const distSq = dx * dx + dz * dz;
    const outer = zone.radius;
    const inner = zone.radius * 0.5;
    if (distSq <= inner * inner) return 'inner';
    if (distSq <= outer * outer) band = 'mid';
  }
  return band;
}

/** True if inside any pocket's outer radius (mid or inner). */
export function isInsideNormalTravelZone(shipPos: THREE.Vector3): boolean {
  return resolveTravelBand(shipPos) !== 'fast';
}

function armEntryBrake(targetSpeed: number): void {
  const current = normalTravelEntryBrakeTargetRef.current;
  // Retarget to the stricter (lower) speed if already braking.
  if (current <= 0 || targetSpeed < current) {
    normalTravelEntryBrakeTargetRef.current = targetSpeed;
    normalTravelEntryBrakingRef.current = true;
  }
}

function clearEntryBrake(): void {
  normalTravelEntryBrakeTargetRef.current = 0;
  normalTravelEntryBrakingRef.current = false;
}

/**
 * Updates band / thrust multiplier refs from the ship's simulation-space
 * position. Arms staged entry braking when crossing into mid or inner bands.
 */
export function updateFastTravelMembership(shipPos: THREE.Vector3): {
  previousMultiplier: number;
  nextMultiplier: number;
  previousBand: TravelBand;
  nextBand: TravelBand;
  enteredNormalZone: boolean;
  enteredFastZone: boolean;
} {
  const previousBand = travelBandRef.current;
  const previousMultiplier = fastTravelThrustMultiplierRef.current;
  const nextBand = resolveTravelBand(shipPos);
  const nextMultiplier = multiplierForBand(nextBand);

  const enteredFastZone = previousBand !== 'fast' && nextBand === 'fast';
  const enteredMidFromFast = previousBand === 'fast' && nextBand === 'mid';
  const enteredInnerFromFast = previousBand === 'fast' && nextBand === 'inner';
  const enteredInnerFromMid = previousBand === 'mid' && nextBand === 'inner';
  const enteredNormalZone = enteredMidFromFast || enteredInnerFromFast;

  travelBandRef.current = nextBand;
  inFastTravelZoneRef.current = nextBand === 'fast';
  fastTravelThrustMultiplierRef.current = nextMultiplier;

  if (enteredMidFromFast) {
    armEntryBrake(NORMAL_TRAVEL_OUTER_ENTRY_MAX_SPEED);
    pushAlert('Normal Travel Enabled', 'yellow');
  }
  if (enteredInnerFromFast) {
    // Crossed both rings in one step — go straight to the inner target.
    armEntryBrake(NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED);
    pushAlert('Normal Travel Enabled', 'yellow');
  }
  if (enteredInnerFromMid) {
    armEntryBrake(NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED);
  }
  if (enteredFastZone) {
    clearEntryBrake();
    pushAlert('Fast Travel Enabled', 'yellow');
  }

  return {
    previousMultiplier,
    nextMultiplier,
    previousBand,
    nextBand,
    enteredNormalZone,
    enteredFastZone,
  };
}
