// ── AIScrapper intro sequence config ──────────────────────────────────────────
import { KEY_THRUST_REVERSE } from './keybindings';

/** Derive a human-readable key label from a KeyboardEvent.code string.
 *  e.g. 'KeyS' → 'S', 'Space' → 'SPACE' */
function codeToLabel(code: string): string {
  return code.startsWith('Key') ? code.slice(3) : code.toUpperCase();
}

/** Hint message shown the moment the player gains control. */
export const SCRAPPER_THRUST_HINT = `PRESS ${codeToLabel(KEY_THRUST_REVERSE)} FOR THRUST`;

/** How long (ms) the thrust hint stays on screen before auto-clearing. */
export const SCRAPPER_THRUST_HINT_DURATION = 5000;


/** Scale applied to the AIScrapper group — must match the scale prop in AIScrapper. */
export const SCRAPPER_SCALE = 3;

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
export const SCRAPPER_EMITTER_A: [number, number, number] = [-6, 0, 0];
export const SCRAPPER_EMITTER_B: [number, number, number] = [6, 0, 22];

/** Half-extents of the scrapper's box collider (at scale = 3). */
export const SCRAPPER_COLLIDER_HALF_EXTENTS = [18, 8, 35] as const;

/** Player ship offset inside scrapper hold — local space, applied after scrapper quat. */
export const SCRAPPER_PLAYER_OFFSET_X = -38;
export const SCRAPPER_PLAYER_OFFSET_Y = -1;
export const SCRAPPER_PLAYER_OFFSET_Z = 0;

// ── Intro sequence timing (ms after braking starts) ───────────────────────────

/** Delay before the cargo container breaks free. */
export const SCRAPPER_BRAKE_EVENT_DELAY = 6000;

/** Delay before the captain's "go get it" cue plays. */
export const SCRAPPER_CAPTAIN_CUE_DELAY = 6000;

/** Delay before player controls are enabled. */
export const SCRAPPER_CONTROLS_ENABLE_DELAY = 9000;

// ── Forward-thrust emitter positions (scrapper local space, scale = 3) ───────
// These fire in -X (behind the ship while cruising toward Venus).
// Adjust to align with the model's main engine nozzles.
export const SCRAPPER_FORWARD_EMITTER_B: [number, number, number] = [0, 0, 0];
/** Ordered dialogue clips played ~2 s after the cargo-release event. */
export const SCRAPPER_INTRO_DIALOGUE_URLS = [
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/retro-thrust.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/metal.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-000.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-005.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-006.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-001.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-002.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-007.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-003.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-008.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/intro-004.mp3',
  'https://kessler-audio.s3.eu-west-2.amazonaws.com/docking-clamps-released.mp3',
];

/** Extra delay (ms) after SCRAPPER_BRAKE_EVENT_DELAY before dialogue starts. */
export const SCRAPPER_DIALOGUE_START_OFFSET = 2000;

// ── Initial orientation ───────────────────────────────────────────────────────

/** Y-axis rotation (radians) applied at spawn so the scrapper already faces the planet.
 *  π = 180° flip; adjust if the model's forward axis differs. */
export const SCRAPPER_INITIAL_ROTATION_Y = -Math.PI;

// ── Camera ────────────────────────────────────────────────────────────────────

/** Spherical radius (zoom distance) locked while the player is in the scrapper hold.
 *  Increase to zoom out; decrease to zoom in. Released when scrapperIntroActive goes false. */
export const SCRAPPER_INTRO_CAMERA_RADIUS = 200;

/** How far behind the scrapper (along its -X axis) the intro camera sits. */
export const SCRAPPER_INTRO_CAMERA_BEHIND_DIST = 450;

/** Height above the scrapper centre the intro camera sits. */
export const SCRAPPER_INTRO_CAMERA_HEIGHT = 230;
