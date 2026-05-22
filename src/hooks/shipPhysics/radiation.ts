import * as THREE from 'three';
import { hullIntegrity, setHullIntegrity } from '../../context/ShipState';
import { radiationExposureRef } from '../../context/RadiationScan';
import {
  activeRadiationZonesRef,
  activeRadiationHullDrainRateRef,
} from '../../context/ActiveRadiationZones';
import { gravityBodies } from '../../context/GravityRegistry';

const _zonePos = new THREE.Vector3();

export function applyRadiationDamage(shipPos: THREE.Vector3, dt: number) {
  const zones = activeRadiationZonesRef.current;
  let totalExposure = 0;

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];

    if (zone.planetName) {
      const body = gravityBodies.get(zone.planetName);
      if (!body) continue;
      _zonePos.copy(body.position);
    } else if (zone.position) {
      _zonePos.copy(zone.position);
    } else {
      _zonePos.set(0, 0, 0);
    }

    const dx = shipPos.x - _zonePos.x;
    const dz = shipPos.z - _zonePos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < zone.radius) {
      const depth = (1 - dist / zone.radius) * zone.intensity;
      if (depth > totalExposure) totalExposure = depth;
    }
  }

  radiationExposureRef.current = Math.min(1, totalExposure);

  if (totalExposure > 0) {
    setHullIntegrity(
      Math.max(
        0,
        hullIntegrity - activeRadiationHullDrainRateRef.current * totalExposure * dt
      )
    );
  }
}
