/** Lunar tutorial moon — shared by LunarLandscape and orbiting props. */
export const LUNAR_MOON_RADIUS = 10000;

/** Top of the lunar sphere in world Y. */
export const LUNAR_SURFACE_Y = -900;

/** World-space center of the tutorial moon sphere. */
export const LUNAR_MOON_CENTER: [number, number, number] = [
  0,
  LUNAR_SURFACE_Y - LUNAR_MOON_RADIUS,
  0,
];

/** Extra distance past the sphere along the surface normal (avoids z-fighting). */
export const LUNAR_SETTLEMENT_SURFACE_LIFT = 80;

/** Fraction of the moon's surface area covered by the settlement cap (0–1). */
export const LUNAR_SETTLEMENT_COVERAGE = 0.02;

/** Coverage at which dome count matches {@link LUNAR_SETTLEMENT_DOME_COUNT}. */
export const LUNAR_SETTLEMENT_COVERAGE_REFERENCE = 0.02;

/** Habitat domes at {@link LUNAR_SETTLEMENT_COVERAGE_REFERENCE} coverage. */
export const LUNAR_SETTLEMENT_DOME_COUNT = 22;

export const LUNAR_SETTLEMENT_DOME_COUNT_MIN = 8;
export const LUNAR_SETTLEMENT_DOME_COUNT_MAX = 96;

/** Minimum flat-plane separation between dome centers at reference coverage. */
export const LUNAR_SETTLEMENT_MIN_DOME_SEPARATION = 120;

/** PRNG seed for dome/road layout. */
export const LUNAR_SETTLEMENT_SEED = 42;

export const LUNAR_SETTLEMENT_MAX_BUILDINGS = 4000;
export const LUNAR_SETTLEMENT_MAX_PARTICLES = 2500;
export const LUNAR_SETTLEMENT_MAX_VEHICLES = 80;

export const LUNAR_SETTLEMENT_DOME_BUILDING_SHARE = 0.55;
export const LUNAR_SETTLEMENT_DOME_PARTICLE_SHARE = 0.45;

/** Geodesic samples per road polyline. */
export const LUNAR_SETTLEMENT_ROAD_SEGMENTS = 48;

export const LUNAR_SETTLEMENT_VEHICLE_SPEED_BASE = 0.055;
export const LUNAR_SETTLEMENT_VEHICLE_SPEED_MIN = 0.55;
export const LUNAR_SETTLEMENT_VEHICLE_SPEED_MAX = 1.45;
