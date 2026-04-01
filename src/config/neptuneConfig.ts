import { SOLAR_SYSTEM_SCALE } from './solarConfig';

// ── Neptune No-Fly Zone ───────────────────────────────────────────────────────
// Distance from Neptune centre at which the no-fly zone triggers (world units).
// Authored at SOLAR_SYSTEM_SCALE = 4 → 5000 × 4 = 20 000.
export const NO_FLY_ZONE_DISTANCE = 5000 * SOLAR_SYSTEM_SCALE;

// Delay (ms) before employer-recall message fires after no-fly zone is triggered
export const EMPLOYER_RECALL_DELAY = 8000;

// ── Railgun ───────────────────────────────────────────────────────────────────
// Distance from Neptune at which Neptune's railguns become active (world units).
// Must be <= NO_FLY_ZONE_DISTANCE to avoid shooting without warning.
export const RAILGUN_STRIKE_DISTANCE = 70000;

// Seconds between consecutive railgun strikes
export const RAILGUN_STRIKE_COOLDOWN = 2.0;

// Duration of the charge-up glow before the railgun fires (seconds)
export const RAILGUN_CHARGE_DURATION = 3.0;

// Duration of the railgun beam visual (seconds)
export const RAILGUN_SHOT_DURATION = 0.28;

// How far the beam extends past the target (world units)
export const RAILGUN_SHOT_OVERSHOOT = 8000;

// Height variance for railgun origin point (world units)
export const RAILGUN_SHOT_HEIGHT_VARIANCE = 12000;
