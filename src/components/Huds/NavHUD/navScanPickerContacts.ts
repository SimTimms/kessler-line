import * as THREE from 'three';
import type { TargetType } from '../../../context/TargetSelection';
import { getMagneticTargets } from '../../../context/MagneticRegistry';

export interface NavScanContact {
  id: string;
  label: string;
  sublabel: string;
  distance: string;
  type: TargetType;
  getPosition: (v: THREE.Vector3) => THREE.Vector3;
  getVelocity?: (v: THREE.Vector3) => THREE.Vector3;
}

export function humanizeCollidableId(id: string): string {
  const magnetic = getMagneticTargets().find((m) => m.id === id);
  if (magnetic) return magnetic.label;
  return id
    .split('-')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}
