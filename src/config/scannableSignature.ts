import type { RefObject } from 'react';
import type * as THREE from 'three';
import type { ColliderShape } from '../context/CollisionRegistry';

/** Custom HUD label for a scanner channel. `true` uses the object's default `label`. */
export type ScannerLabelConfig = { label: string };

/** Per-object scanner visibility flags (tutorial and world props). */
export interface ScannableSignature {
  /** When false, no scanner registries are updated for this object. */
  scannable?: boolean;
  /** `true` uses object `label`; pass `{ label }` for a magnetic-specific HUD name. */
  magnet?: boolean | ScannerLabelConfig;
  /** `true` uses object `label`; pass `{ label }` for a drive-signature-specific HUD name. */
  driveSignature?: boolean | ScannerLabelConfig;
  /** `true` uses object `label`; pass `{ label }` for a proximity-specific HUD name. */
  proximity?: boolean | ScannerLabelConfig;
  /**
   * Radio contacts use dedicated components (e.g. `RadioBeacon`) and narrative
   * chatter — not the magnetic/drive/proximity registries.
   */
  radio?: boolean;
  /**
   * Radiation damage/visuals come from `RadiationZones` config entries, not mesh flags.
   */
  radiation?: boolean;
}

export interface ScannableRegistrationOptions extends ScannableSignature {
  id: string;
  label: string;
  groupRef: RefObject<THREE.Group | null>;
  proximityShape?: ColliderShape;
}

/** Resolve a per-scanner label; returns `null` when the scanner is disabled. */
export function resolveScannerLabel(
  config: boolean | ScannerLabelConfig | undefined,
  fallback: string
): string | null {
  if (!config) return null;
  return typeof config === 'object' ? config.label : fallback;
}
