/**
 * Criteria that determines when a tutorial step auto-advances.
 *
 * - continue      — manual Continue button only
 * - keydown       — any key in `codes` is pressed
 * - event         — a named window CustomEvent fires (e.g. 'ShipUndocked')
 * - mouseOrbit    — user holds left mouse button and drags past a movement threshold
 * - mouseScroll   — user turns the scroll wheel at least once
 * - speed         — ship speed exceeds `min` (m/s) at least once
 * - angular       — ship angular velocity exceeds `min` at least once
 * - all           — every sub-criterion in `criteria` must be met (AND gate)
 */

export type CompletionCriteria =
  | { type: 'continue' }
  | { type: 'keydown'; codes: string[] }
  | { type: 'event'; name: string }
  | { type: 'mouseOrbit' }
  | { type: 'mouseScroll' }
  | { type: 'speed'; min: number }
  | { type: 'angular'; min: number }
  | { type: 'all'; criteria: CompletionCriteria[] };
