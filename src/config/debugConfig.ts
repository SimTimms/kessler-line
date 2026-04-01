// ── Ship physics debugging ────────────────────────────────────────────────
/** Disable gravity on the ship (useful for placement testing). */
export const DEBUG_DISABLE_GRAVITY = false;
/** Freeze collision responses (ship passes through objects). */
export const DEBUG_FREEZE_COLLISIONS = false;
/** Log to console whenever a physics delta spike is detected. */
export const DEBUG_LOG_DELTA_SPIKES = false;
/** Enable render-position smoothing (lerp between physics and render pos). */
export const DEBUG_SMOOTH_RENDER = true;

// ── Railgun engine hit debugging ─────────────────────────────────────────
/** Log railgun engine hit calculations to console. */
export const DEBUG_RAILGUN_ENGINE_HITS = true;
/** Log when engine disabled state changes. */
export const DEBUG_ENGINE_DISABLE_CHANGES = true;

// ── Scene dev spawn overrides ─────────────────────────────────────────────
/** Spawn near Jupiter instead of Neptune (ignores autosave). */
export const DEV_JUPITER_TEST = false;
/** Spawn near Mars instead of Neptune (ignores autosave). */
export const DEV_MARS_TEST = false;

// ── Spaceship ─────────────────────────────────────────────────────────────
/** Show thruster hitbox debug wireframes on the spaceship. */
export const DEBUG_THRUSTER_HITBOXES = false;

// ── Railgun visual debugging ──────────────────────────────────────────────
/** Show a hit-sphere at the railgun impact point. */
export const DEBUG_RAILGUN = true;
/** Scale factor applied to the debug hit sphere radius. */
export const DEBUG_HIT_SCALE = 10;
