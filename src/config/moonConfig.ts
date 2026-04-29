// Moon body — tutorial placement and gravity tuned for sandbox scale (ship ~1000 units away).

export const MOON_BODY_ID = 'Moon';

export const MOON_TEXTURE_URL = '/moon.jpg';
/** Grayscale height / bump (paired with diffuse for relief). */
export const MOON_BUMP_MAP_URL = '/moon_bump.jpg';

/** World-space sphere radius (visual + gravity surface). */
export const TUTORIAL_MOON_RADIUS = 72;

/** Moon center relative to tutorial origin; ship starts at [0,0,0]. */
export const TUTORIAL_MOON_POSITION: [number, number, number] = [1000, 0, 0];

// mu = surfaceGravity × radius²  →  surface acceleration = mu / r² at the surface
export const MOON_SURFACE_GRAVITY = 4.2;

export const MOON_SOI_MULTIPLIER = 28;
