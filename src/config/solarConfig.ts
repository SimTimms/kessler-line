// ── Solar System Scale ────────────────────────────────────────────────────────
// This is the single source of truth for solar system size.
// Change SOLAR_SYSTEM_SCALE to resize the entire solar system proportionally.
// Ship models, station models, and ship physics do NOT scale.
// Camera and minimap scale is handled separately.

export const SOLAR_SYSTEM_SCALE = 1000;
export const SUN_RADIUS_BASE = 100; // Sun display radius in local (pre-scale) space
export const SUN_SCALE_MULTIPLIER = 4; // Visual-only sun scale — does not affect orbits or planet sizes
export const SUN_WORLD_RADIUS = SUN_RADIUS_BASE * SOLAR_SYSTEM_SCALE;

// Ideal orbit altitude = planet surface radius × this multiplier.
// At SOLAR_SYSTEM_SCALE = 500, Neptune's radius ≈ 25 630, so 1.0 ≈ 25 625 units above surface.
export const ORBIT_ALTITUDE_MULTIPLIER = 2.0;

/** Default surface gravity for planets without an explicit override (mu = g × r²). */
export const DEFAULT_PLANET_SURFACE_GRAVITY = 2.0;

/** Mars — tuned for sandbox/tutorial capture (≈ real Mars relative to Earth). */
export const MARS_SURFACE_GRAVITY = 2.0;

/** Real surface g relative to Earth (1.0), scaled so Mars ≈ MARS_SURFACE_GRAVITY. */
const SURFACE_G_SCALE = MARS_SURFACE_GRAVITY / 0.376;

export const MERCURY_SURFACE_GRAVITY = SURFACE_G_SCALE * 0.378;
export const VENUS_SURFACE_GRAVITY = SURFACE_G_SCALE * 0.907;
export const EARTH_SURFACE_GRAVITY = SURFACE_G_SCALE * 1.0;
export const JUPITER_SURFACE_GRAVITY = SURFACE_G_SCALE * 2.528;
export const SATURN_SURFACE_GRAVITY = SURFACE_G_SCALE * 1.065;
export const URANUS_SURFACE_GRAVITY = SURFACE_G_SCALE * 0.886;
export const NEPTUNE_SURFACE_GRAVITY = SURFACE_G_SCALE * 1.14;

/** Sphere of influence = surfaceRadius × this multiplier (see applyGravityStep). */
export const PLANET_SOI_MULTIPLIER = 3.0;
