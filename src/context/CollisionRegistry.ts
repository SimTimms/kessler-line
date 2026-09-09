import * as THREE from 'three';
import type { DockCaptureProfile } from '../config/dockCaptureConfig';

export type ColliderShape =
  | {
      type: 'sphere';
      radius: number;
    }
  | {
      type: 'box';
      halfExtents: THREE.Vector3; // x = half‑width, y = half‑height, z = half‑depth
    }
  | {
      type: 'capsule';
      radius: number;
      height: number; // cylindrical section height (not including caps)
    };

export interface CollidableEntry {
  id: string;
  /** Proximity HUD label when registered via {@link useScannableRegistration}. */
  label?: string;
  stationId?: string;

  /** Write current world position into `target` and return it. */
  getWorldPosition: (target: THREE.Vector3) => THREE.Vector3;

  /** Optional orientation for non-spherical shapes */
  getWorldQuaternion?: (target: THREE.Quaternion) => THREE.Quaternion;

  /** Optional world velocity for moving collidables */
  getWorldVelocity?: (target: THREE.Vector3) => THREE.Vector3;

  /** Shape definition */
  shape: ColliderShape;

  /** Returns the actual rendered Three.js object for wireframe overlay, if available. */
  getObject3D?: () => THREE.Object3D | null;

  /** Collision callback; `impulse` is `collisionNormal * impactSpeed` for the receiver to scale. */
  applyImpulse?: (impulse: THREE.Vector3) => void;

  /** Spherical body surface — inward impact destroys the ship and spawns dust VFX. */
  planetSurfaceImpact?: boolean;

  /** When false, stays visible to scanners/debug but is skipped in hull collision. */
  physicalCollision?: boolean;

  /** When true, hidden from the minimap as a hard contact (scanner detection still works). */
  scannerOnlyMinimap?: boolean;

  /** Optional docking capture profile used by docking helpers for this bay. */
  dockingProfile?: DockCaptureProfile;
}

const registry = new Map<string, CollidableEntry>();

export function registerCollidable(entry: CollidableEntry): void {
  registry.set(entry.id, entry);
}

export function unregisterCollidable(id: string): void {
  registry.delete(id);
}

export function getCollidables(): CollidableEntry[] {
  return Array.from(registry.values());
}
