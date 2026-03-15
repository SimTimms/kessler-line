// ── Cascade phase ─────────────────────────────────────────────────────────────
export type CascadePhase = 'pre' | 'during' | 'post';
export const cascadePhase: { current: CascadePhase } = { current: 'pre' };
export function setCascadePhase(phase: CascadePhase) {
  cascadePhase.current = phase;
}

// Shared chatter state — written by CinematicController, readable by debug panel
export const chatterState: { lines: string[]; index: number } = { lines: [], index: 0 };

export const cinematicAutopilotActive = { current: false };
export const neptuneNoFlyZoneActive = { current: false };
export const neptuneNoFlyZoneMessage = { current: '' };
export const shipInstructionMessage = { current: '' };
export const radioChatterMessage = { current: '' };
