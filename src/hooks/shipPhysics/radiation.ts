import * as THREE from 'three';
import { hullIntegrity, setHullIntegrity } from '../../context/ShipState';
import { radiationExposureRef } from '../../context/RadiationScan';
import { RADIATION_ZONES, RADIATION_HULL_DRAIN_RATE } from '../../config/radiationConfig';
import { gravityBodies } from '../../context/GravityRegistry';

// Per-zone current position cache — updated each call from gravityBodies for planet-linked zones
const _zonePos = RADIATION_ZONES.map((z) => z.position?.clone() ?? new THREE.Vector3());

export function applyRadiationDamage(shipPos: THREE.Vector3, dt: number) {
  let totalExposure = 0;

  for (let i = 0; i < RADIATION_ZONES.length; i++) {
    const zone = RADIATION_ZONES[i];

    if (zone.planetName) {
      const body = gravityBodies.get(zone.planetName);
      if (body) _zonePos[i].copy(body.position);
    }

    const dx = shipPos.x - _zonePos[i].x;
    const dz = shipPos.z - _zonePos[i].z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < zone.radius) {
      const depth = (1 - dist / zone.radius) * zone.intensity;
      if (depth > totalExposure) totalExposure = depth;
    }
  }

  radiationExposureRef.current = Math.min(1, totalExposure);

  if (totalExposure > 0) {
    setHullIntegrity(Math.max(0, hullIntegrity - RADIATION_HULL_DRAIN_RATE * totalExposure * dt));
  }
}
