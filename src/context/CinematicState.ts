import * as THREE from 'three';

// ── Scrapper intro ─────────────────────────────────────────────────────────────
/** True while the player ship is pinned inside the scrapper's hold. */
export const scrapperIntroActive = { current: true };
/** World-space position of the AIScrapper, updated every frame. */
export const scrapperWorldPos = new THREE.Vector3();
/** World-space quaternion of the AIScrapper, updated every frame. */
export const scrapperWorldQuat = new THREE.Quaternion();
/** True while the scrapper is firing retro-burn engines. */
export const scrapperRetroFiring = { current: false };
/** True while the scrapper is firing forward (main cruise) engines. */
export const scrapperForwardFiring = { current: false };

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
