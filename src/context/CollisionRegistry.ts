import * as THREE from 'three';

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

  /**
   * Called when the ship collides with this object.
   * `impulse` is `collisionNormal * impactSpeed` — a vector pointing away from
   * the ship's approach direction, pre-scaled by impact magnitude.
   * The receiver should scale by its own mass/impulse factor.
   */
  applyImpulse?: (impulse: THREE.Vector3) => void;
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
