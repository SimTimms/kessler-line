// ── Solar System Scale ────────────────────────────────────────────────────────
// This is the single source of truth for solar system size.
// Change SOLAR_SYSTEM_SCALE to resize the entire solar system proportionally.
// Ship models, station models, and ship physics do NOT scale.
// Camera and minimap scale is handled separately.

export const SOLAR_SYSTEM_SCALE = 40;
export const SUN_RADIUS_BASE = 100; // Sun display radius in local (pre-scale) space
export const SUN_WORLD_RADIUS = SUN_RADIUS_BASE * SOLAR_SYSTEM_SCALE;
