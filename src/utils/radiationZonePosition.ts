import * as THREE from 'three';
import type { RadiationZoneDef } from '../config/radiationConfig';
import { gravityBodies } from '../context/GravityRegistry';

/** World position for a zone, or false if the zone cannot be resolved (e.g. missing planet body). */
export function resolveRadiationZoneWorldPosition(
  zone: RadiationZoneDef,
  target: THREE.Vector3,
): boolean {
  if (zone.planetName) {
    const body = gravityBodies.get(zone.planetName);
    if (!body) return false;
    target.copy(body.position);
    return true;
  }
  if (zone.position) {
    target.copy(zone.position);
    return true;
  }
  return false;
}

/** Horizontal (XZ) distance — matches RadiationZones visibility and hull damage. */
export function horizontalDistanceToRadiationZone(
  shipPos: THREE.Vector3,
  zonePos: THREE.Vector3,
): number {
  const dx = shipPos.x - zonePos.x;
  const dz = shipPos.z - zonePos.z;
  return Math.sqrt(dx * dx + dz * dz);
}
