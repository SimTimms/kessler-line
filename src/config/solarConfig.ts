// ── Solar System Scale ────────────────────────────────────────────────────────
// This is the single source of truth for solar system size.
// Change SOLAR_SYSTEM_SCALE to resize the entire solar system proportionally.
// Ship models, station models, and ship physics do NOT scale.
// Camera and minimap scale is handled separately.

export const SOLAR_SYSTEM_SCALE = 500;
export const SUN_RADIUS_BASE = 100; // Sun display radius in local (pre-scale) space
export const SUN_SCALE_MULTIPLIER = 4; // Visual-only sun scale — does not affect orbits or planet sizes
export const SUN_WORLD_RADIUS = SUN_RADIUS_BASE * SOLAR_SYSTEM_SCALE;

// Ideal orbit altitude = planet surface radius × this multiplier.
// At SOLAR_SYSTEM_SCALE = 500, Neptune's radius ≈ 25 630, so 1.0 ≈ 25 625 units above surface.
export const ORBIT_ALTITUDE_MULTIPLIER = 2.0;
