// ── Communications delay configuration ────────────────────────────────────────
// All message delays are computed from real in-game distances.

// Approximate km per game unit. Calibrated so Neptune↔Earth max separation
// (~4.7 billion km real) maps to ~3.5 million game units.
export const KM_PER_UNIT = 1340;

// Speed of light in km/s.
export const SPEED_OF_LIGHT_KM_S = 299_792;

// Game time compression. 1 real second = GAME_TIME_RATE game seconds.
// At 600: a 4-hour game delay arrives in ~24 real seconds.
export const GAME_TIME_RATE = 600;

// Platforms that bypass delay (priority trunk, arrives instantly).
export const PRIORITY_PLATFORMS = ['HERALD'] as const;
