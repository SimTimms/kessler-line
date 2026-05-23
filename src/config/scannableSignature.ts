import type { RefObject } from 'react';
import type * as THREE from 'three';
import type { ColliderShape } from '../context/CollisionRegistry';

/** Per-object scanner visibility flags (tutorial and world props). */
export interface ScannableSignature {
  /** When false, no scanner registries are updated for this object. */
  scannable?: boolean;
  magnet?: boolean;
  driveSignature?: boolean;
  proximity?: boolean;
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
