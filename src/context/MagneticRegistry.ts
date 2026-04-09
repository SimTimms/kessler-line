import * as THREE from 'three';

export interface MagneticEntry {
  id: string;
  label: string;
  /** Write current world position into `target` and return it. */
  getPosition: (target: THREE.Vector3) => THREE.Vector3;
}

const registry = new Map<string, MagneticEntry>();

export function registerMagnetic(entry: MagneticEntry): void {
  registry.set(entry.id, entry);
}

export function unregisterMagnetic(id: string): void {
  registry.delete(id);
}

export function getMagneticTargets(): MagneticEntry[] {
  return Array.from(registry.values());
}
