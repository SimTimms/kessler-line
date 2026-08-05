// ── Damage & Resource Config ──────────────────────────────────────────────────
// Tuning values for hull damage, O2/fuel drain, and refill rates.

// Hull damage from collisions: damage = impactSpeed × multiplier
export const COLLISION_DAMAGE_MULTIPLIER = 2;

// Railgun hit damage (randomised between min and max)
export const RAILGUN_DAMAGE_MIN = 20;
export const RAILGUN_DAMAGE_MAX = 30;

// O2 drain rate per crew member (units per second per person, always active)
export const O2_DRAIN_RATE = 0.05;

/** Total O2 drain (units/s) scales linearly with crew aboard. */
export function o2DrainRateForCrew(crewCount: number): number {
  return O2_DRAIN_RATE * Math.max(1, Math.floor(crewCount));
}

// Hull stress damage — applies when thrust multiplier is maxed out and thrusting
// One damage tick (1 HP) fires every HULL_STRESS_DAMAGE_INTERVAL seconds
export const HULL_STRESS_DAMAGE_INTERVAL = 100;

// Refill rates while docked (units per second)
export const FUEL_REFILL_RATE = 10;
export const O2_REFILL_RATE = 10;

/** O2 at or below this level is treated as dangerous (matches Power HUD red). */
export const O2_DANGER_THRESHOLD = 20;

/** Hull level where continuous breach leaks begin (percentage, inclusive). */
export const HULL_BREACH_START_THRESHOLD = 75;
/** O2 drain multiplier while hull integrity is in breach range. */
export const HULL_BREACH_O2_DRAIN_MULTIPLIER = 3;
/** Hull level where critical alarm audio begins looping (percentage, inclusive). */
export const HULL_CRITICAL_THRESHOLD = 40;
/** Gain for the critical hull alarm loop. */
export const HULL_CRITICAL_ALARM_VOLUME = 0.4;

/**
 * Global scaler for powered ship systems (scanner/radio/spotlight and any
 * future per-second system drains that feed ship power consumption).
 */
export const SYSTEM_POWER_DRAIN_MULTIPLIER = 1;

/** Apply global balancing to per-second ship-system power drain. */
export function scaleSystemPowerDrainPerSecond(baseDrainPerSecond: number): number {
  return Math.max(0, baseDrainPerSecond) * SYSTEM_POWER_DRAIN_MULTIPLIER;
}

/** Propellant drain per active thrust axis per second at thrust multiplier 1. */
export const FUEL_BURN_RATE = 0.001;
