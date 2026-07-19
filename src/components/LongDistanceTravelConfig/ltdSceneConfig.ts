import * as THREE from 'three';
import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import {
  getPlanetPosition,
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

export const LONG_DISTANCE_TRAVEL_CONFIG = {
  fogColor: '#02040a',
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  solarSystemScale: SOLAR_SYSTEM_SCALE,
  /** Match Drone Config orbit pose relative to the ship. */
  tutorialFollowOffset: [0, 100, 120] as [number, number, number],
  tutorialCameraZoomMax: 820,
  planetImpactCameraHoldMaxAltitude: 80_000,
  shipParticleCount: 100,
};
