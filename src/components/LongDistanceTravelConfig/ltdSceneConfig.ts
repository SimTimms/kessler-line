import * as THREE from 'three';
import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import { ORBIT_ALTITUDE_MULTIPLIER, SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import {
  getPlanetPosition,
  getPlanetWorldRadius,
  getPositionTowardSunFromPlanetSurface,
} from '../../config/planetPosition';

/** Static salvage pocket: this far above Neptune's surface, toward the Sun. */
export const LTD_SALVAGE_ALTITUDE_ABOVE_NEPTUNE = 800_000;

/** Prefix dock/cargo ids so this scene does not collide with Salvage Config. */
export const LTD_SALVAGE_ID_PREFIX = 'ltd-';

export function getLtdSalvageFieldOrigin(target = new THREE.Vector3()): THREE.Vector3 {
  return getPositionTowardSunFromPlanetSurface(
    'Neptune',
    LTD_SALVAGE_ALTITUDE_ABOVE_NEPTUNE,
    target
  );
}

export function getLtdShipSpawn(): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const fieldOrigin = getLtdSalvageFieldOrigin();
  const neptune = getPlanetPosition('Neptune');
  const towardNeptune = neptune.clone().sub(fieldOrigin).setY(0);
  if (towardNeptune.lengthSq() < 1e-6) {
    towardNeptune.set(1, 0, 0);
  } else {
    towardNeptune.normalize();
  }
  const yaw = Math.atan2(towardNeptune.x, towardNeptune.z);

  return {
    position: [fieldOrigin.x, fieldOrigin.y + 1.2, fieldOrigin.z],
    rotation: [0, yaw, 0],
  };
}

/** Normal-travel pocket around the salvage field; outside is fast travel. */
export const LTD_NORMAL_TRAVEL_ZONE_ID = 'ltd-salvage-normal';
/** Radius of the normal-travel pocket (world units). Outside = fast travel. */
export const LTD_NORMAL_TRAVEL_ZONE_RADIUS = 2000;

/** Normal-travel (slow) pocket centered on Neptune. */
export const LTD_NEPTUNE_NORMAL_TRAVEL_ZONE_ID = 'ltd-neptune-normal';

/** Shrink the Neptune slow zone inward from the ideal-orbit ring (world units). */
export const LTD_NEPTUNE_NORMAL_TRAVEL_ZONE_RADIUS_SHRINK = 50_000;

/**
 * Outer radius from Neptune centre — ideal-orbit ring minus
 * {@link LTD_NEPTUNE_NORMAL_TRAVEL_ZONE_RADIUS_SHRINK}
 * (`surfaceRadius + surfaceRadius × {@link ORBIT_ALTITUDE_MULTIPLIER}`).
 */
export function getLtdNeptuneNormalTravelZoneRadius(): number {
  const surfaceRadius = getPlanetWorldRadius('Neptune');
  const idealOrbitRadius = surfaceRadius + surfaceRadius * ORBIT_ALTITUDE_MULTIPLIER;
  return Math.max(
    surfaceRadius,
    idealOrbitRadius - LTD_NEPTUNE_NORMAL_TRAVEL_ZONE_RADIUS_SHRINK
  );
}

export function getLtdNeptuneZoneCenter(target = new THREE.Vector3()): THREE.Vector3 {
  return getPlanetPosition('Neptune', target);
}

export const LONG_DISTANCE_TRAVEL_CONFIG = {
  fogColor: '#02040a',
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  solarSystemScale: SOLAR_SYSTEM_SCALE,
  /** Match Drone Config orbit pose relative to the ship. */
  tutorialFollowOffset: [0, 100, 120] as [number, number, number],
  tutorialCameraZoomMax: 820,
  planetImpactCameraHoldMaxAltitude: 5_000,
  shipParticleCount: 100,
  normalTravelZoneRadius: LTD_NORMAL_TRAVEL_ZONE_RADIUS,
  /** Match Salvage Config warm key / fill lighting. */
  lighting: {
    ambientIntensity: 0.15,
    keyLight: {
      position: [180, 100, 80] as [number, number, number],
      intensity: 2,
      color: '#e8a050',
    },
    fillLight: {
      position: [-100, 40, -60] as [number, number, number],
      intensity: 2,
      color: '#c96b28',
    },
  },
};
