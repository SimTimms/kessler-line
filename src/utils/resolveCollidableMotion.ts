import * as THREE from 'three';
import type { CollidableEntry } from '../context/CollisionRegistry';
import { gravityBodies } from '../context/GravityRegistry';
import { getMagneticTargets } from '../context/MagneticRegistry';
import { getDriveSignatures } from '../context/DriveSignatureRegistry';
import { humanizeCollidableId } from '../components/Huds/NavHUD/navScanPickerContacts';

const PLANET_SURFACE_PREFIX = 'planet-surface-';

export function resolveCollidableLabel(entry: CollidableEntry): string {
  if (entry.label) return entry.label;
  const magnetic = getMagneticTargets().find((m) => m.id === entry.id);
  if (magnetic) return magnetic.label;
  const drive = getDriveSignatures().find((d) => d.id === entry.id);
  if (drive) return drive.label;
  if (entry.id.startsWith(PLANET_SURFACE_PREFIX)) {
    return entry.id.slice(PLANET_SURFACE_PREFIX.length);
  }
  return humanizeCollidableId(entry.id);
}

export function resolveCollidableVelocity(
  entry: CollidableEntry,
  target: THREE.Vector3
): THREE.Vector3 {
  if (entry.getWorldVelocity) {
    return entry.getWorldVelocity(target);
  }

  if (entry.id.startsWith(PLANET_SURFACE_PREFIX)) {
    const bodyId = entry.id.slice(PLANET_SURFACE_PREFIX.length);
    const body = gravityBodies.get(bodyId);
    if (body) return target.copy(body.velocity);
  }

  const body = gravityBodies.get(entry.id);
  if (body) return target.copy(body.velocity);

  return target.set(0, 0, 0);
}
