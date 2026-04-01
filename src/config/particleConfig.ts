// ── Starfield ────────────────────────────────────────────────────────────
/** Number of star particles in the wrapping starfield. */
export const STARFIELD_COUNT = 1200;
/** Half-extent of the wrapping cube — particles re-enter on the opposite side. */
export const STARFIELD_HALF = 2500;

// ── Nebula ────────────────────────────────────────────────────────────────
/** Total number of nebula puff sprites. */
export const NEBULA_COUNT = 90;
/** Spread radius of the nebula cloud (world units, cube-root distribution). */
export const NEBULA_SPREAD = 6000;
/** How many of the total puffs are large background puffs (most subtle). */
export const NEBULA_LARGE_COUNT = 30;
/** Minimum hue for nebula colours (0–1 HSL). Purple–violet range. */
export const NEBULA_HUE_MIN = 0.7;
/** Maximum hue for nebula colours (0–1 HSL). */
export const NEBULA_HUE_MAX = 0.84;

// ── Asteroid belt ─────────────────────────────────────────────────────────
/** Instances per asteroid geometry type. Total = 3 × this value. */
export const ASTEROID_BELT_COUNT_PER_TYPE = 520;
/** Minimum world-Y for an asteroid to receive collision registration. */
export const ASTEROID_BELT_COLLIDER_Y_MIN = -100;
/** Maximum world-Y for an asteroid to receive collision registration. */
export const ASTEROID_BELT_COLLIDER_Y_MAX = 100;
/** Minimum base size of an individual asteroid (before per-axis scale variance). */
export const ASTEROID_SIZE_MIN = 10;
/** Maximum base size of an individual asteroid (before per-axis scale variance). */
export const ASTEROID_SIZE_MAX = 55;

// ── Ship particle cloud ───────────────────────────────────────────────────
/** Number of particles in the ambient ship particle cloud effect. */
export const SHIP_PARTICLE_COUNT = 10;
/** Speed below which the particle cloud is suppressed (world units/s). */
export const SHIP_PARTICLE_SPEED_MIN = 300;
/** Speed above which the particle cloud is fully active (world units/s). */
export const SHIP_PARTICLE_SPEED_MAX = 500;
