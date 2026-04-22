import * as THREE from 'three';

/** An AI ship that has registered its drive signature for HUD tracking. */
export interface DriveSignatureEntry {
  id: string;
  label: string;
  getPosition: (target: THREE.Vector3) => THREE.Vector3;
  /** Write current world velocity into `target` and return it. Optional. */
  getVelocity?: (target: THREE.Vector3) => THREE.Vector3;
}

const entries: DriveSignatureEntry[] = [];

export function registerDriveSignature(entry: DriveSignatureEntry) {
  entries.push(entry);
}

export function unregisterDriveSignature(id: string) {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) entries.splice(idx, 1);
}

export function getDriveSignatures(): readonly DriveSignatureEntry[] {
  return entries;
}
