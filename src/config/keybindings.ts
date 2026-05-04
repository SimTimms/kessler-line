/**
 * keybindings.ts — centralised key mappings for all game controls.
 *
 * Values match the KeyboardEvent.code property (e.g. 'KeyW') for controls that
 * use e.code, and KeyboardEvent.key (e.g. 'F5') for controls that use e.key.
 * Both conventions are preserved so the consuming hooks remain unchanged except
 * for referencing this file instead of inline strings.
 */

// ─── Ship thrust / rotation (use e.code) ─────────────────────────────────────
export const KEY_THRUST_REVERSE = 'KeyW';
export const KEY_THRUST_FORWARD = 'KeyS';
export const KEY_YAW_LEFT = 'KeyA';
export const KEY_YAW_RIGHT = 'KeyD';
export const KEY_STRAFE_LEFT = 'KeyQ'; // port  (Q)
export const KEY_STRAFE_RIGHT = 'KeyE'; // starboard (E)
export const KEY_RADIAL_OUT = 'KeyR'; // away from planet
export const KEY_RADIAL_IN = 'KeyF'; // toward planet
export const KEY_UNDOCK_CARGO = 'Space'; // undock when docked; cargo release otherwise

/** Dispatched by the Undock HUD control; handled in useInputListeners (same effect as Space when docked). */
export const EVENT_REQUEST_UNDOCK = 'RequestUndock';
export const KEY_THRUST_INCREASE = 'Equal'; // + / = key (increase thrust multiplier)
export const KEY_THRUST_INCREASE_NP = 'NumpadAdd'; // numpad +
export const KEY_THRUST_DECREASE = 'Minus'; // - key (decrease thrust multiplier)
export const KEY_THRUST_DECREASE_NP = 'NumpadSubtract'; // numpad -

// ─── HUD toggles (use e.code) ────────────────────────────────────────────────
export const KEY_TOGGLE_MINIMAP = 'KeyM';
/** Nav HUD: target line, orbit arcs, approach readouts (see `navHudEnabledRef`). */
export const KEY_TOGGLE_NAV_HUD = 'KeyN';

// ─── Camera (use e.code) ─────────────────────────────────────────────────────
/** Free / Nav camera vs ship-follow (main `Camera` + tutorial follow camera). */
export const KEY_TOGGLE_CAMERA_DECOUPLE = 'KeyC';

// ─── Save / Load (use e.key) ─────────────────────────────────────────────────
export const KEY_MANUAL_SAVE = 'F5';
export const KEY_MANUAL_LOAD = 'F9';

/** Short label for tutorials / HUD (from `KeyboardEvent.code`). */
export function displayLabelForKeyCode(code: string): string {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Equal') return '=';
  if (code === 'Minus') return '-';
  if (code === 'NumpadAdd') return 'Num +';
  if (code === 'NumpadSubtract') return 'Num −';
  return code;
}
