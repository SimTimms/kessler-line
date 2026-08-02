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

const _humanizeCache = new Map<string, string>();

export function humanizeCollidableId(id: string): string {
  const cached = _humanizeCache.get(id);
  if (cached !== undefined) return cached;
  const magnetic = getMagneticTargets().find((m) => m.id === id);
  if (magnetic) {
    _humanizeCache.set(id, magnetic.label);
    return magnetic.label;
  }
  const label = id
    .split('-')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
  _humanizeCache.set(id, label);
  return label;
}
