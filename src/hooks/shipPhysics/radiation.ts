import * as THREE from 'three';
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
import {
  setVesselHullIntegrity,
  type VesselRuntimeState,
} from '../../context/VesselStateStore';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { setHullIntegrity } from '../../context/ShipState';

const _zonePos = new THREE.Vector3();

export function applyRadiationDamage(
  vesselId: string,
  vesselState: VesselRuntimeState,
  shipPos: THREE.Vector3,
  dt: number,
  trackHudRates = true
) {
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
    if (trackHudRates) {
      resourceRateRefs.hull.current = -hullDrainPerSec;
    }
    const nextHull = Math.max(0, vesselState.hullIntegrity - hullDrainPerSec * dt);
    if (vesselId === PLAYER_VESSEL_ID) {
      setHullIntegrity(nextHull);
    } else {
      setVesselHullIntegrity(vesselId, nextHull);
    }
  } else {
    if (trackHudRates) {
      resourceRateRefs.hull.current = 0;
    }
  }
}
