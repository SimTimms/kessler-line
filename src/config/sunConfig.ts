// ── Sun point light ───────────────────────────────────────────────────────
// Light intensity scales with scale² (inverse square law) and distance
// scales linearly. Both are multiplied by (SOLAR_SYSTEM_SCALE / 4) at runtime,
// where 4 is the authored baseline scale.

/** Base intensity for the sun's point light at scale=4. */
export const SUN_LIGHT_INTENSITY_BASE = 1_000_000;
/** Base range (world units) for the sun's point light at scale=4. */
export const SUN_LIGHT_DISTANCE_BASE = 1_000_000;

// ── Sun corona ────────────────────────────────────────────────────────────
/** Opacity of the inner corona sphere mesh. */
export const SUN_CORONA_OPACITY = 0.28;
/** Corona sphere radius expressed as a multiplier of the sun's base radius. */
export const SUN_CORONA_SCALE = 1.02;

// ── Lens flare texture sizes ──────────────────────────────────────────────
/** Canvas resolution (px) for the primary glow texture. */
export const LENS_FLARE_GLOW_SIZE = 512;
/** Canvas resolution (px) for ghost element textures. */
export const LENS_FLARE_GHOST_SIZE = 128;
/** Canvas resolution (px) for ring element textures. */
export const LENS_FLARE_RING_SIZE = 256;

// ── Lens flare element chain ──────────────────────────────────────────────
// Elements are positioned along the screen-centre → sun axis.
// distance=0 is the sun, distance=1 is directly opposite on screen.
// textureType: 'glow' = soft radial gradient; 'ring' = thin ring; 'ghost' = smaller glow.
export const LENS_FLARE_ELEMENTS: {
  textureType: 'glow' | 'ghost' | 'ring';
  size: number;
  distance: number;
  color: [number, number, number];
}[] = [
  { textureType: 'glow',  size: 700, distance: 0.0,  color: [1.0, 0.95, 0.82] },
  { textureType: 'ring',  size: 80,  distance: 0.4,  color: [0.5, 0.7,  1.0 ] },
  { textureType: 'ghost', size: 55,  distance: 0.55, color: [1.0, 0.85, 0.3 ] },
  { textureType: 'ring',  size: 95,  distance: 0.65, color: [0.9, 0.4,  0.9 ] },
  { textureType: 'ghost', size: 45,  distance: 0.75, color: [0.3, 0.9,  0.6 ] },
  { textureType: 'ring',  size: 130, distance: 0.85, color: [1.0, 0.5,  0.2 ] },
  { textureType: 'ghost', size: 70,  distance: 1.0,  color: [0.6, 0.5,  1.0 ] },
];
