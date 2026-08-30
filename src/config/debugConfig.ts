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
export const DEBUG_RAILGUN_ENGINE_HITS = false;
/** Log when engine disabled state changes. */
export const DEBUG_ENGINE_DISABLE_CHANGES = false;

// ── Scene dev spawn overrides ─────────────────────────────────────────────
/** Spawn near Jupiter instead of Neptune (ignores autosave). */
export const DEV_JUPITER_TEST = false;
/** Spawn near Mars instead of Neptune (ignores autosave). */
export const DEV_MARS_TEST = false;
/** Spawn next to the Comms Buffer Satellite orbiting Mars (ignores autosave). */
export const DEV_COMMS_BUFFER_SATELLITE_TEST = false;
/** Open the Comms Buffer Satellite dock panel after first undock (debug mission dialogue). */
export const DEV_COMMS_BUFFER_PANEL_ON_UNDOCK = false;

// ── Large-world rendering ─────────────────────────────────────────────────
/** Sandbox uses {@link FloatingOrigin} (ship-relative GPU coords). Main Scene.tsx next. */
export const SANDBOX_USE_FLOATING_ORIGIN = false;

// ── Collision debugging ───────────────────────────────────────────────────
/**
 * Draw wireframe overlays for every registered collidable, synced each frame
 * to world position/quaternion (orbiting bodies included).
 * Ship hull + sample spheres are parented in ship-local space; other collidables
 * use a floating origin at the ship to avoid float32 jitter at large coordinates.
 * Colors: ship hull box = green, ship physics samples = light green,
 * docking bays = cyan, scanner-only (no hull hit) = faint yellow,
 * planet surfaces = faint orange, other obstacles = red. Magenta arrows = velocity.
 */
export const DEBUG_SHOW_COLLIDABLES = false;

// ── Spaceship ─────────────────────────────────────────────────────────────
/** Show thruster hitbox debug wireframes on the spaceship. */
export const DEBUG_THRUSTER_HITBOXES = false;

// ── Railgun visual debugging ──────────────────────────────────────────────
/** Show a hit-sphere at the railgun impact point. */
export const DEBUG_RAILGUN = false;
/** Scale factor applied to the debug hit sphere radius. */
export const DEBUG_HIT_SCALE = 10;

// ── Collision physics test harness ───────────────────────────────────────
/**
 * Enable keyboard-driven collision physics test tools in the main scene.
 * Press F8 to toggle active test mode, J to fire one test projectile, K for a 5-shot burst.
 */
export const DEBUG_COLLISION_PHYSICS_TESTS = false;
/** Speed (units/s) of fired test projectiles. */
export const DEBUG_COLLISION_TEST_PROJECTILE_SPEED = 90;
/** Spawn distance (units) from the ship for incoming test projectiles. */
export const DEBUG_COLLISION_TEST_SPAWN_DISTANCE = 220;

// ── Performance overlay ───────────────────────────────────────────────────
/** Show the realtime performance monitor in the top-right corner. */
export const DEBUG_SHOW_PERF_MONITOR = false;
