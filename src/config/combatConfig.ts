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
