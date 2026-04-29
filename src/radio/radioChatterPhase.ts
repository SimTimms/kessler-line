import { chatterState, setCascadePhase, type CascadePhase } from '../context/CinematicState';
import {
  RADIO_CHATTER_LINES,
  RADIO_CHATTER_CASCADE_LINES,
  RADIO_CHATTER_POST_CASCADE_LINES,
} from '../narrative/radioChatter';

const POOLS: Record<CascadePhase, readonly string[]> = {
  pre: RADIO_CHATTER_LINES,
  during: RADIO_CHATTER_CASCADE_LINES,
  post: RADIO_CHATTER_POST_CASCADE_LINES,
};

/**
 * Single entry point for ambient radio: keeps `cascadePhase` and `chatterState.lines`
 * aligned (used by {@link RadioChatterStream}, cinematics, debug panel, tutorial).
 */
export function setRadioChatterPhase(phase: CascadePhase): void {
  setCascadePhase(phase);
  chatterState.lines = [...POOLS[phase]];
  chatterState.index = 0;
}

/**
 * Replace the ambient pool without changing `cascadePhase` (e.g. tutorial-only lines).
 * Main game should call {@link setRadioChatterPhase} on exit to restore phase + pool.
 */
export function applyRadioChatterPool(lines: readonly string[]): void {
  chatterState.lines = [...lines];
  chatterState.index = 0;
}
