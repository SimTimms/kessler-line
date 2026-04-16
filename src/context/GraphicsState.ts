import { QUALITY_PRESETS } from '../config/graphicsConfig';
import type { GraphicsQuality, GraphicsSettings } from '../config/graphicsConfig';

const STORAGE_KEY = 'crubbs_graphics_quality';

function detectDefaultQuality(): GraphicsQuality {
  // Rough heuristic: hardware thread count as a proxy for GPU tier
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores <= 2) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}

function loadQuality(): GraphicsQuality {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as GraphicsQuality | null;
    if (stored && stored in QUALITY_PRESETS) return stored;
  } catch {
    // ignore — localStorage unavailable
  }
  return detectDefaultQuality();
}

// Module-level singleton — consistent with ShipState, CinematicState, etc.
let _quality: GraphicsQuality = loadQuality();
const _listeners = new Set<() => void>();

export function getGraphicsSettings(): GraphicsSettings {
  return QUALITY_PRESETS[_quality];
}

export function getQuality(): GraphicsQuality {
  return _quality;
}

export function setQuality(q: GraphicsQuality): void {
  if (_quality === q) return;
  _quality = q;
  try {
    localStorage.setItem(STORAGE_KEY, q);
  } catch {
    // ignore
  }
  _listeners.forEach((fn) => fn());
}

/** Subscribe to quality changes. Returns an unsubscribe function. */
export function subscribeQuality(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
