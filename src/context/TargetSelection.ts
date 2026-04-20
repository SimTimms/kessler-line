import * as THREE from 'three';

export type TargetType = 'magnetic' | 'ship' | 'default';

export let selectedTargetName: string | null = null;
export let selectedTargetKey: string | null = null;
export let selectedTargetType: TargetType | null = null;
export const selectedTargetVelocity = new THREE.Vector3();
export const selectedTargetPosition = new THREE.Vector3();

export function selectTarget(
  name: string,
  velocity?: THREE.Vector3,
  position?: THREE.Vector3,
  key: string = name,
  type: TargetType = 'default',
) {
  selectedTargetName = name;
  selectedTargetKey = key;
  selectedTargetType = type;
  selectedTargetVelocity.copy(velocity ?? new THREE.Vector3());
  selectedTargetPosition.copy(position ?? new THREE.Vector3());
  window.dispatchEvent(new CustomEvent('SelectedTargetChanged', { detail: { name, type } }));
}

/** Clear the selected target (e.g. when a new nav destination is chosen from the dialog). */
export function clearSelectedTarget() {
  selectedTargetName = null;
  selectedTargetKey = null;
  selectedTargetType = null;
  window.dispatchEvent(new CustomEvent('SelectedTargetChanged', { detail: { name: null, type: null } }));
}

/** Timestamp (ms) until which the relative-speed HUD row should flash. */
export let targetFlashUntil = 0;

/** Flash the relative-speed row in the HUD for the given duration. */
export function flashTarget(durationMs = 4000) {
  targetFlashUntil = Date.now() + durationMs;
}
