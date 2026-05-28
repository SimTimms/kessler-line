import * as THREE from 'three';

/**
 * Random point on the hull belly in ship-local space.
 * +Z = nose, -Y = down through the underside (matches hover thrusters).
 */
export function randomBellySpawnLocal(target: THREE.Vector3): void {
  target.set(
    (Math.random() - 0.5) * 6,
    -1.4 - Math.random() * 0.8,
    (Math.random() - 0.5) * 10
  );
}

/**
 * Ejection impulse in ship-local space: dominant -Y (belly), lateral ±X only.
 * No forward/aft component — avoids shooting crew or vent plumes out the stern.
 */
export function randomBellyEjectDirectionLocal(target: THREE.Vector3): void {
  const lateral = (Math.random() - 0.5) * 0.9;
  const down = 0.88 + Math.random() * 0.12;
  target.set(lateral, -down, 0).normalize();
}

/** Small velocity jitter in ship-local space (X/Y only). */
export function randomBellyEjectSpreadLocal(target: THREE.Vector3, magnitude: number): void {
  target.set(
    (Math.random() - 0.5) * magnitude * 2,
    (Math.random() - 0.5) * magnitude * 2,
    0
  );
}
