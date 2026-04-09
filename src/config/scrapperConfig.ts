// ── AIScrapper intro sequence config ──────────────────────────────────────────

/** Forward cruise speed toward Venus (world units / second). */
export const SCRAPPER_CRUISE_SPEED = 180;

/** Deceleration during braking phase (world units / second²). */
export const SCRAPPER_BRAKE_DECEL = 60;

/** Distance from Venus centre at which braking begins (world units). */
export const SCRAPPER_BRAKE_TRIGGER_DIST = 88_000;

/** Rotation speed for the 180° flip maneuver (radians per second). */
export const SCRAPPER_TURN_SPEED = 0.8; // ~3.9 s for a full 180°

// ── Retro-burn emitter positions (scrapper local space, scale = 3) ────────────
// These are placeholder positions — adjust to align with model nozzles.
export const SCRAPPER_EMITTER_A: [number, number, number] = [-6, 0, 22];
export const SCRAPPER_EMITTER_B: [number, number, number] = [6, 0, 22];

/** Half-extents of the scrapper's box collider (at scale = 3). */
export const SCRAPPER_COLLIDER_HALF_EXTENTS = [18, 8, 35] as const;

/** Player ship offset inside scrapper hold — local space, applied after scrapper quat. */
export const SCRAPPER_PLAYER_OFFSET_X = 0;
export const SCRAPPER_PLAYER_OFFSET_Z = 10;

// ── Intro sequence timing (ms after braking starts) ───────────────────────────

/** Delay before the cargo container breaks free. */
export const SCRAPPER_BRAKE_EVENT_DELAY = 6000;

/** Delay before the captain's "go get it" cue plays. */
export const SCRAPPER_CAPTAIN_CUE_DELAY = 6000;

/** Delay before player controls are enabled. */
export const SCRAPPER_CONTROLS_ENABLE_DELAY = 9000;

// ── Initial orientation ───────────────────────────────────────────────────────

/** Y-axis rotation (radians) applied at spawn so the scrapper already faces the planet.
 *  π = 180° flip; adjust if the model's forward axis differs. */
export const SCRAPPER_INITIAL_ROTATION_Y = -Math.PI;

// ── Camera ────────────────────────────────────────────────────────────────────

/** Spherical radius (zoom distance) locked while the player is in the scrapper hold.
 *  Increase to zoom out; decrease to zoom in. Released when scrapperIntroActive goes false. */
export const SCRAPPER_INTRO_CAMERA_RADIUS = 200;
