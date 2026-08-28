import * as THREE from 'three';

/**
 * Exponential moving average smoothing factor (0–1).
 * Lower = smoother / more lag. 0.15 gives ~6-sample settling.
 */
const EMA_ALPHA = 0.15;

interface CacheEntry {
  /** Smoothed closing speed (EMA). */
  smoothed: number;
}

const cache = new Map<string, CacheEntry>();

/** Scratch vector — avoids allocation in the hot path. */
const _relVel = new THREE.Vector3();

/**
 * Return the closing speed between the ship and a target using velocity
 * vector subtraction (KSP approach), smoothed with an exponential moving
 * average for display stability.
 *
 * Sign convention matches the existing HUD display:
 *   positive → receding (distance increasing)
 *   negative → approaching (distance decreasing)
 *
 * @param targetId   Unique key for per-target EMA cache
 * @param shipVel    Ship velocity vector (world-space)
 * @param targetVel  Target velocity vector (world-space)
 * @param toTarget   Unnormalized ship→target vector
 * @param distance   Length of toTarget (precomputed to avoid recomputation)
 */
export function getClosingSpeed(
  targetId: string,
  shipVel: THREE.Vector3,
  targetVel: THREE.Vector3,
  toTarget: THREE.Vector3,
  distance: number,
): number {
  if (distance < 1e-6) return 0;

  // raw = dot(V_target - V_ship, toTarget) / distance
  // This is d(distance)/dt: positive when receding, negative when approaching.
  _relVel.subVectors(targetVel, shipVel);
  const raw = _relVel.dot(toTarget) / distance;

  const entry = cache.get(targetId);

  if (!entry) {
    cache.set(targetId, { smoothed: raw });
    return raw;
  }

  const smoothed = entry.smoothed + EMA_ALPHA * (raw - entry.smoothed);
  entry.smoothed = smoothed;

  return smoothed;
}

/**
 * Clear cached EMA state.
 *
 * Call when switching targets to avoid a stale cross-target delta spike.
 *   - No argument → clear all entries
 *   - With `targetId` → clear only that entry
 */
export function clearClosingSpeedCache(targetId?: string): void {
  if (targetId === undefined) {
    cache.clear();
  } else {
    cache.delete(targetId);
  }
}
