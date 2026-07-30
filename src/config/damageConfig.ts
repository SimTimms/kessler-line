// ── Damage & Resource Config ──────────────────────────────────────────────────
// Tuning values for hull damage, O2/fuel drain, and refill rates.

// Hull damage from collisions: damage = impactSpeed × multiplier
export const COLLISION_DAMAGE_MULTIPLIER = 2;

// Railgun hit damage (randomised between min and max)
export const RAILGUN_DAMAGE_MIN = 20;
export const RAILGUN_DAMAGE_MAX = 30;

// O2 drain rate per crew member (units per second per person, always active)
// TEMP: raised for testing low-O2 feedback (breathing SFX / HUD). Restore to 0.05 later.
export const O2_DRAIN_RATE = 1;

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

/** Propellant drain per active thrust axis per second at thrust multiplier 1. */
export const FUEL_BURN_RATE = 0.001;
