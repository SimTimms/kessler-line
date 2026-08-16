import * as THREE from 'three';
import {
  FAST_TRAVEL_MAX_THRUST_MULTIPLIER,
  FAST_TRAVEL_THRUST_MULTIPLIER,
  NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED,
  NORMAL_TRAVEL_OUTER_ENTRY_MAX_SPEED,
  NORMAL_TRAVEL_THRUST_MULTIPLIER,
} from '../config/fastTravelConfig';
import { pushAlert } from './AlertsStore';

// ── Travel zone SFX ───────────────────────────────────────────────────────
const CRASH_STOP_SFX_SRC = '/audio/ship/crash-stop-engaged.mp3';
const THRUSTER_LIMITS_REMOVED_SFX_SRC = '/audio/ship/thruster-limits-removed.mp3';
let _crashStopAudio: HTMLAudioElement | null = null;
let _thrusterLimitsAudio: HTMLAudioElement | null = null;

function playCrashStop(): void {
  try {
    if (!_crashStopAudio) {
      _crashStopAudio = new Audio(CRASH_STOP_SFX_SRC);
      _crashStopAudio.preload = 'auto';
    }
    _crashStopAudio.pause();
    _crashStopAudio.currentTime = 0;
    _crashStopAudio.volume = 0.5;
    _crashStopAudio.playbackRate = 1;
    _crashStopAudio.loop = false;
    void _crashStopAudio.play().catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

function playThrusterLimitsRemoved(): void {
  try {
    if (!_thrusterLimitsAudio) {
      _thrusterLimitsAudio = new Audio(THRUSTER_LIMITS_REMOVED_SFX_SRC);
      _thrusterLimitsAudio.preload = 'auto';
    }
    _thrusterLimitsAudio.pause();
    _thrusterLimitsAudio.currentTime = 0;
    _thrusterLimitsAudio.volume = 0.5;
    _thrusterLimitsAudio.playbackRate = 1;
    _thrusterLimitsAudio.loop = false;
    void _thrusterLimitsAudio.play().catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

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

/**
 * Live thrust-multiplier ceiling from the current band.
 * `0` means the FT system is inactive (no pockets registered).
 */
export const fastTravelThrustMultiplierRef: { current: number } = {
  current: 0,
};

/** True while the ship is fully outside all normal pockets (full FT). */
export const inFastTravelZoneRef: { current: boolean } = { current: false };

/** Current band: inner core, mid (outer half), or full fast travel. */
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
  fastTravelThrustMultiplierRef.current = 0;
  inFastTravelZoneRef.current = false;
  travelBandRef.current = 'inner';
  normalTravelEntryBrakeTargetRef.current = 0;
  normalTravelEntryBrakingRef.current = false;
}

export function getNormalTravelZones(): readonly NormalTravelZone[] {
  return Array.from(zones.values());
}

/**
 * Max thrust multiplier the player may engage right now.
 * When no pockets are registered, returns `null` (use ship {@link MAX_THRUST_MULTIPLIER}).
 */
export function getActiveThrustMultiplierCap(): number | null {
  const cap = fastTravelThrustMultiplierRef.current;
  return cap > 0 ? cap : null;
}

function clampZoneCap(value: number): number {
  return THREE.MathUtils.clamp(
    value,
    NORMAL_TRAVEL_THRUST_MULTIPLIER,
    FAST_TRAVEL_MAX_THRUST_MULTIPLIER
  );
}

/**
 * Thrust-multiplier ceiling for a band.
 * Returns `0` when no pockets are registered (system inactive).
 */
function thrustCapForBand(band: TravelBand): number {
  if (zones.size === 0) return 0;
  if (band === 'inner') return clampZoneCap(NORMAL_TRAVEL_THRUST_MULTIPLIER);
  // Mid (outer half) and fast both allow the fast-travel ceiling.
  return clampZoneCap(FAST_TRAVEL_THRUST_MULTIPLIER);
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
  return zones.size > 0 && resolveTravelBand(shipPos) !== 'fast';
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
 * Updates band / thrust-cap refs from the ship's simulation-space position.
 * Arms staged entry braking when crossing into mid or inner bands.
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
  const nextMultiplier = thrustCapForBand(nextBand);

  const enteredFastZone = previousBand !== 'fast' && nextBand === 'fast';
  const enteredMidFromFast = previousBand === 'fast' && nextBand === 'mid';
  const enteredInnerFromFast = previousBand === 'fast' && nextBand === 'inner';
  const enteredInnerFromMid = previousBand === 'mid' && nextBand === 'inner';
  const enteredNormalZone = enteredMidFromFast || enteredInnerFromFast;

  travelBandRef.current = nextBand;
  inFastTravelZoneRef.current = zones.size > 0 && nextBand === 'fast';
  fastTravelThrustMultiplierRef.current = nextMultiplier;

  if (enteredMidFromFast) {
    armEntryBrake(NORMAL_TRAVEL_OUTER_ENTRY_MAX_SPEED);
    pushAlert('Normal Travel Enabled', 'yellow');
    playCrashStop();
  }
  if (enteredInnerFromFast) {
    // Crossed both rings in one step — go straight to the inner target.
    armEntryBrake(NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED);
    pushAlert('Normal Travel Enabled', 'yellow');
    playCrashStop();
  }
  if (enteredInnerFromMid) {
    armEntryBrake(NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED);
  }
  if (enteredFastZone) {
    clearEntryBrake();
    pushAlert('Fast Travel Enabled', 'yellow');
    playThrusterLimitsRemoved();
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
