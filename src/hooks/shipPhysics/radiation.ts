import * as THREE from 'three';
import { hullIntegrity, setHullIntegrity } from '../../context/ShipState';
import { radiationExposureRef } from '../../context/RadiationScan';
import {
  activeRadiationZonesRef,
  activeRadiationHullDrainRateRef,
} from '../../context/ActiveRadiationZones';
import { resourceRateRefs } from '../../context/ResourceRates';
import {
  resolveRadiationZoneWorldPosition,
  horizontalDistanceToRadiationZone,
} from '../../utils/radiationZonePosition';

const _zonePos = new THREE.Vector3();

export function applyRadiationDamage(shipPos: THREE.Vector3, dt: number) {
  const zones = activeRadiationZonesRef.current;
  let totalExposure = 0;

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];

    if (!resolveRadiationZoneWorldPosition(zone, _zonePos)) continue;

    const dist = horizontalDistanceToRadiationZone(shipPos, _zonePos);
    if (dist < zone.radius) {
      const depth = (1 - dist / zone.radius) * zone.intensity;
      if (depth > totalExposure) totalExposure = depth;
    }
  }

  radiationExposureRef.current = Math.min(1, totalExposure);

  if (totalExposure > 0) {
    const hullDrainPerSec = activeRadiationHullDrainRateRef.current * totalExposure;
    resourceRateRefs.hull.current = -hullDrainPerSec;
    setHullIntegrity(Math.max(0, hullIntegrity - hullDrainPerSec * dt));
  } else {
    resourceRateRefs.hull.current = 0;
  }
}
