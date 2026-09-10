import * as THREE from 'three';

export type PhysicalBody = {
  id: string;
  initialPosition: THREE.Vector3;
  initialVelocity: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
};

export const physicalRegistry = new Map<string, PhysicalBody>();

export function registerPhysical(entry: PhysicalBody): void {
  physicalRegistry.set(entry.id, entry);
}

export function unregisterPhysical(id: string): void {
  physicalRegistry.delete(id);
}

export function getPhysicals(): PhysicalBody[] {
  return Array.from(physicalRegistry.values());
}

export function findPhysical(id: string): PhysicalBody | undefined {
  return physicalRegistry.get(id);
}
