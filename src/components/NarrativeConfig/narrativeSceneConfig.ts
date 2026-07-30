import * as THREE from 'three';
import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import { getPlanetPosition, getPlanetWorldRadius } from '../../config/planetPosition';
import { PLANET_SOI_MULTIPLIER, SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';

type Vec3 = [number, number, number];

export const NARRATIVE_PRIMARY_FIELD_ID_PREFIX = 'narrative-a-';
export const NARRATIVE_SECONDARY_FIELD_ID_PREFIX = 'narrative-b-';

export const NARRATIVE_PRIMARY_ZONE_ID = 'narrative-primary-normal';
export const NARRATIVE_SECONDARY_ZONE_ID = 'narrative-secondary-normal';
export const NARRATIVE_MARS_ZONE_ID = 'narrative-mars-normal';

/** Primary salvage hub sits just outside Mars SOI. */
const PRIMARY_FIELD_MARGIN_OUTSIDE_MARS_SOI = 12_000;
/** Secondary drone-style hub sits further around Mars for cargo runs. */
const SECONDARY_FIELD_ARC_RADIANS = Math.PI * 0.62;
const SECONDARY_FIELD_EXTRA_RADIUS = 220_000;
/** Slow zone around each asteroid hub. */
export const NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS = 2_800;
/** Mars slow zone starts this far above surface (world units). */
const MARS_NORMAL_TRAVEL_ALTITUDE_FROM_SURFACE = 50_000;

const EXTRA_CONTAINERS_LOCAL_TO_PRIMARY_FIELD: Array<{
  id: string;
  label: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}> = [
  {
    id: 'cargo-b',
    label: 'Narrative Cargo B',
    position: [-80, -10, 145],
    rotation: [0, -0.55, 0],
    scale: 1,
  },
  {
    id: 'cargo-c',
    label: 'Narrative Cargo C',
    position: [170, -18, -120],
    rotation: [0, 1.2, 0],
    scale: 1,
  },
  {
    id: 'cargo-d',
    label: 'Narrative Cargo D',
    position: [-210, -22, -25],
    rotation: [0, 0.2, 0],
    scale: 1,
  },
  {
    id: 'cargo-e',
    label: 'Narrative Cargo E',
    position: [260, -16, 170],
    rotation: [0, -1.4, 0],
    scale: 1,
  },
];

function getMarsSoiRadius(): number {
  return getPlanetWorldRadius('Mars') * PLANET_SOI_MULTIPLIER;
}

export function getNarrativePrimaryFieldOrigin(target = new THREE.Vector3()): THREE.Vector3 {
  const marsPos = getPlanetPosition('Mars');
  const marsSoiRadius = getMarsSoiRadius();
  const fromSun = marsPos.clone().setY(0);
  if (fromSun.lengthSq() < 1e-6) {
    fromSun.set(1, 0, 0);
  } else {
    fromSun.normalize();
  }
  return target
    .copy(marsPos)
    .addScaledVector(fromSun, marsSoiRadius + PRIMARY_FIELD_MARGIN_OUTSIDE_MARS_SOI);
}

export function getNarrativeSecondaryFieldOrigin(target = new THREE.Vector3()): THREE.Vector3 {
  const marsPos = getPlanetPosition('Mars');
  const primary = getNarrativePrimaryFieldOrigin();
  const radial = primary.clone().sub(marsPos).setY(0);
  if (radial.lengthSq() < 1e-6) {
    radial.set(1, 0, 0);
  } else {
    radial.normalize();
  }

  const rotated = radial.applyAxisAngle(new THREE.Vector3(0, 1, 0), SECONDARY_FIELD_ARC_RADIANS);
  const marsSoiRadius = getMarsSoiRadius();
  return target
    .copy(marsPos)
    .addScaledVector(
      rotated,
      marsSoiRadius + PRIMARY_FIELD_MARGIN_OUTSIDE_MARS_SOI + SECONDARY_FIELD_EXTRA_RADIUS
    );
}

export function getNarrativeShipSpawn(): {
  position: Vec3;
  rotation: Vec3;
} {
  const primary = getNarrativePrimaryFieldOrigin();
  const secondary = getNarrativeSecondaryFieldOrigin();
  const towardSecondary = secondary.clone().sub(primary).setY(0);
  if (towardSecondary.lengthSq() < 1e-6) {
    towardSecondary.set(1, 0, 0);
  } else {
    towardSecondary.normalize();
  }
  const spawn = primary
    .clone()
    .addScaledVector(towardSecondary, -320)
    .add(new THREE.Vector3(0, 1.2, 220));
  const towardPrimary = primary.clone().sub(spawn).setY(0).normalize();
  const yaw = Math.atan2(towardPrimary.x, towardPrimary.z);
  return {
    position: [spawn.x, spawn.y, spawn.z],
    rotation: [0, yaw, 0],
  };
}

export function getNarrativeMarsZoneCenter(target = new THREE.Vector3()): THREE.Vector3 {
  return getPlanetPosition('Mars', target);
}

export function getNarrativeMarsNormalTravelRadius(): number {
  const marsWorldRadius = getPlanetWorldRadius('Mars');
  const marsSoiRadius = getMarsSoiRadius();
  return Math.max(
    marsWorldRadius,
    Math.min(marsSoiRadius, marsWorldRadius + MARS_NORMAL_TRAVEL_ALTITUDE_FROM_SURFACE)
  );
}

export const NARRATIVE_CONFIG = {
  fogColor: '#02040a',
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  solarSystemScale: SOLAR_SYSTEM_SCALE,
  tutorialFollowOffset: [0, 100, 120] as Vec3,
  tutorialCameraZoomMax: 820,
  planetImpactCameraHoldMaxAltitude: 5_000,
  shipParticleCount: 100,
  lighting: {
    ambientIntensity: 0.15,
    keyLight: {
      position: [180, 100, 80] as Vec3,
      intensity: 0.1,
      color: '#e8a050',
    },
    fillLight: {
      position: [-100, 40, -60] as Vec3,
      intensity: 0.5,
      color: '#c96b28',
    },
  },
  extraContainersLocalToPrimaryField: EXTRA_CONTAINERS_LOCAL_TO_PRIMARY_FIELD,
};
