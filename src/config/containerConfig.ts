// ── Cargo Container Config ────────────────────────────────────────────────────

/** Number of containers to scatter across the world at game start. */
export const CONTAINER_COUNT = 25;

/** Distance from the ship at which physics activates (and collider registers). */
export const CONTAINER_PHYSICS_RADIUS = 5000;

/** Min/max spawn distance from the world origin (world units). */
export const CONTAINER_SPAWN_RADIUS_MIN = 2000;
export const CONTAINER_SPAWN_RADIUS_MAX = 30000;

/** Max vertical (Y) scatter from the ecliptic plane. */
export const CONTAINER_SPAWN_Y_SPREAD = 1500;

/** Uniform scale applied to the container.glb model. */
export const CONTAINER_SCALE = 1;

/**
 * Multiplier applied to the raw collision impulse before adding it to container
 * velocity. Higher = containers get kicked harder by ship collisions.
 */
export const CONTAINER_IMPULSE_SCALE = 0.8;

/**
 * Maximum relative speed (m/s) between ship and container at the moment of
 * docking-port contact for a capture to succeed.
 */
export const CONTAINER_CAPTURE_SPEED = 50;

/**
 * Forward impulse (m/s, in ship's +Z direction) added to ship velocity when
 * releasing a captured container with spacebar.
 */
export const CONTAINER_RELEASE_IMPULSE = 6;

// ── Docking attachment offset ─────────────────────────────────────────────────
// Local-space offset applied on top of the docking port position when a
// container is clamped to the ship. Tweak these to align the model visually.
export const CONTAINER_DOCK_OFFSET_X = 0;
export const CONTAINER_DOCK_OFFSET_Y = 0;
export const CONTAINER_DOCK_OFFSET_Z = 7;

/**
 * Velocity damping per second (0–1). 1 = no damping (drift forever),
 * 0 = instant stop. Applied each frame via Math.pow(damping, delta).
 */
export const CONTAINER_VELOCITY_DAMPING = 0.85;
