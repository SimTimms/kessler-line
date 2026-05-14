// ── Laser spotlight ───────────────────────────────────────────────────────
/** Light colour of the cursor-tracking spotlight. */
export const LASER_SPOTLIGHT_COLOR = '#ffffff';
/** Luminous intensity of the spotlight. */
export const LASER_SPOTLIGHT_INTENSITY = 8;
/** Half-angle of the spotlight cone (radians). */
export const LASER_SPOTLIGHT_ANGLE = 0.58;
/** Soft-edge fraction (0 = hard edge, 1 = fully soft). */
export const LASER_SPOTLIGHT_PENUMBRA = 0.85;
/** Physically-based distance falloff exponent (lower = slower falloff). */
export const LASER_SPOTLIGHT_DECAY = 0.2;
/**
 * Maximum range of the spotlight in world units.
 * 0 = unlimited (Three.js removes the hard cutoff; falloff is governed by decay only).
 */
export const LASER_SPOTLIGHT_DISTANCE = 0;

// ── Railgun beam geometry ─────────────────────────────────────────────────
/** Outer radius of the railgun beam cylinder (world units). */
export const RAILGUN_BEAM_OUTER_RADIUS = 0.03;
/** Inner radius of the railgun beam core cylinder (world units). */
export const RAILGUN_BEAM_INNER_RADIUS = 0.012;

// ── Railgun beam colours ──────────────────────────────────────────────────
/** Outer beam colour (hot plasma trail). */
export const RAILGUN_BEAM_COLOR = '#ff2a00';
/** Inner core colour (superheated core). */
export const RAILGUN_BEAM_CORE_COLOR = '#fff6cc';

// ── Railgun beam fade ─────────────────────────────────────────────────────
/** Peak opacity of the outer beam at the start of the shot. */
export const RAILGUN_BEAM_MAX_OPACITY = 0.45;
/** Peak opacity of the inner core at the start of the shot. */
export const RAILGUN_CORE_MAX_OPACITY = 0.7;

// ── Railgun charge-up glow ────────────────────────────────────────────────
/** Radius of the outer charge glow sphere (world units). */
export const RAILGUN_CHARGE_GLOW_RADIUS = 200;
/** Radius of the inner charge core sphere (world units). */
export const RAILGUN_CHARGE_CORE_RADIUS = 75;
/** HDR luminance multiplier for the charge glow — values >1 feed the Bloom pass. */
export const RAILGUN_CHARGE_INTENSITY = 20;
/** Peak opacity of the outer charge glow at full charge. */
export const RAILGUN_CHARGE_GLOW_MAX_OPACITY = 1.0;
/** Peak opacity of the inner charge core at full charge. */
export const RAILGUN_CHARGE_CORE_MAX_OPACITY = 1.0;

// ── Capital-ship railgun beam (scrapper cinematic) ─────────────────────────
/** Outer radius of the capital-ship railgun beam cylinder (world units). */
export const CAPITAL_RAILGUN_BEAM_OUTER_RADIUS = 150;
/** Inner radius of the capital-ship railgun core cylinder (world units). */
export const CAPITAL_RAILGUN_BEAM_INNER_RADIUS = 60;
/** Outer beam colour — electric blue. */
export const CAPITAL_RAILGUN_BEAM_COLOR = '#2255ff';
/** Inner core colour — pure white. */
export const CAPITAL_RAILGUN_CORE_COLOR = '#ffffff';
/** Peak opacity of the outer beam. */
export const CAPITAL_RAILGUN_BEAM_MAX_OPACITY = 0.9;
/** Peak opacity of the inner core. */
export const CAPITAL_RAILGUN_CORE_MAX_OPACITY = 1.0;
/** Duration of the visible beam flash (seconds). */
export const CAPITAL_RAILGUN_SHOT_DURATION = 0.6;
/** Duration of the charge-up glow before firing (seconds). */
export const CAPITAL_RAILGUN_CHARGE_DURATION = 2.0;
/** Radius of the outer charge glow sphere on Neptune's surface (world units). */
export const CAPITAL_RAILGUN_CHARGE_GLOW_RADIUS = 2000;
/** Radius of the inner charge core sphere (world units). */
export const CAPITAL_RAILGUN_CHARGE_CORE_RADIUS = 800;
/** HDR luminance multiplier for the charge glow. */
export const CAPITAL_RAILGUN_CHARGE_INTENSITY = 50;
/** Distance the beam extends past the target (world units). */
export const CAPITAL_RAILGUN_OVERSHOOT = 20000;
