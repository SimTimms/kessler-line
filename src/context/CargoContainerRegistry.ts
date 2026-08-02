import type * as THREE from 'three';

export type CargoContainerHandle = {
  id: string;
  getWorldPosition: (target: THREE.Vector3) => THREE.Vector3;
  getWorldVelocity: (target: THREE.Vector3) => THREE.Vector3;
  getGroup: () => THREE.Group | null;
  isTowed: () => boolean;
  isDropOffBusy: () => boolean;
  /** True after intake finished and the crate was hidden. */
  isConsumed: () => boolean;
  /**
   * Pad takes ownership: freeze physics, disable collision, parent under pad anchor.
   * Returns false if the crate cannot be captured (towed / busy / consumed).
   */
  beginDropOff: (padAnchor: THREE.Object3D) => boolean;
  /** Sync world refs from the parented group after pad animation steps. */
  syncFromGroup: () => void;
  /** Hide crate and mark consumed after inventory transfer. */
  completeDropOff: () => void;
  /**
   * Direct read of simulation-space position. Used by CargoContainerProximityManager
   * to avoid a getWorldPosition (worldToLocal traversal) per container per frame.
   */
  getSimPosition: () => THREE.Vector3;
  /**
   * Called by the centralized proximity manager to activate/deactivate the
   * docking bay. Keeps state updates out of individual useFrame loops.
   */
  setDockingBayProximity: (active: boolean) => void;
};

const containers = new Map<string, CargoContainerHandle>();

export function registerCargoContainer(handle: CargoContainerHandle): void {
  containers.set(handle.id, handle);
}

export function unregisterCargoContainer(id: string): void {
  containers.delete(id);
}

export function getCargoContainer(id: string): CargoContainerHandle | undefined {
  return containers.get(id);
}

export function listCargoContainers(): CargoContainerHandle[] {
  return [...containers.values()];
}

/**
 * Iterate all registered containers without allocating a new array.
 * Use this in hot paths (e.g. per-frame proximity checks).
 */
export function forEachCargoContainer(fn: (handle: CargoContainerHandle) => void): void {
  for (const handle of containers.values()) {
    fn(handle);
  }
}
