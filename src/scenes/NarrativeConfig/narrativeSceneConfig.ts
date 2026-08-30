import * as THREE from 'three';
import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import { getPlanetPosition, getPlanetWorldRadius } from '../../config/planetPosition';
import { PLANET_SOI_MULTIPLIER, SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { inventoryItems, type InventoryItem } from '../../inventory/inventory-types';
import { DEV_COMMS_BUFFER_SATELLITE_TEST } from '../../config/debugConfig';
import {
  BUFFER_ORBIT_RADIUS,
  BUFFER_ORBIT_PHASE,
} from '../../config/events/comms-relay-mission/comms-relay-config';

type Vec3 = [number, number, number];

export const NARRATIVE_PRIMARY_ZONE_ID = 'narrative-primary-normal';
export const NARRATIVE_SECONDARY_ZONE_ID = 'narrative-secondary-normal';
export const NARRATIVE_MARS_ZONE_ID = 'narrative-mars-normal';
export const NARRATIVE_SATELLITE_CONTAINER_LOCAL_ID = 'satellite-payload';
export const NARRATIVE_SATELLITE_CONTAINER_LABEL = 'Orbital Survey Satellite';

/** Primary salvage hub sits just outside Mars SOI. */
const PRIMARY_FIELD_MARGIN_OUTSIDE_MARS_SOI = 12_000;
/** Secondary field (Bakerfield Falls) sits inside Mars SOI, ~200 k from primary. */
const SECONDARY_FIELD_ARC_RADIANS = 0.09;
const SECONDARY_FIELD_INSET_BELOW_SOI = 20_000;
/** Slow zone around each asteroid hub. */
export const NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS = 2_800;

const EXTRA_CONTAINERS_LOCAL_TO_PRIMARY_FIELD: Array<{
  id: string;
  label: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}> = (() => {
  const basePosition: Vec3 = [-210, -22, -25];
  const baseRotation: Vec3 = [0, 0.2, 0];
  const containersPerRow = 10;
  const rowCount = 3;
  const columnGap = 22;
  const rowGap = 64;

  const containers: Array<{
    id: string;
    label: string;
    position: Vec3;
    rotation: Vec3;
    scale: number;
  }> = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < containersPerRow; column += 1) {
      const index = row * containersPerRow + column + 1;
      const id = `cargo-${index.toString().padStart(2, '0')}`;
      containers.push({
        id,
        label: '',
        position: [
          basePosition[0] + column * columnGap,
          basePosition[1],
          basePosition[2] + row * rowGap,
        ],
        rotation: [...baseRotation] as Vec3,
        scale: 1,
      });
    }
  }

  return containers;
})();

const SATELLITE_MISSION_CONFIG = {
  id: NARRATIVE_SATELLITE_CONTAINER_LOCAL_ID,
  label: NARRATIVE_SATELLITE_CONTAINER_LABEL,
  // Spawned beside the Donington berth at rest.
  position: [382, 0, 130] as Vec3,
  rotation: [0, Math.PI, 0] as Vec3,
  initialVelocity: [0, 0, 0] as Vec3,
  scale: 0.4,
};

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
    .addScaledVector(rotated, marsSoiRadius - SECONDARY_FIELD_INSET_BELOW_SOI);
}

/** Station ID used for the Donington dock partner registration. */
export const NARRATIVE_DONINGTON_STATION_ID = `salvage-berth`;

/** Collision ID of the Donington Station docking bay (hover dock). */
export const NARRATIVE_DONINGTON_DOCK_ID = `docking-bay-${NARRATIVE_DONINGTON_STATION_ID}`;

/** Prefix so Bakerfield Falls SalvageField ids do not collide with Donington. */
export const NARRATIVE_BAKERFIELD_ID_PREFIX = 'bakerfield-';

/**
 * Spawn position at the Donington Station dock bay so the ship starts docked.
 * Dock local offset `[300, -20, 0]` relative to the primary field origin.
 *
 * When {@link DEV_COMMS_BUFFER_SATELLITE_TEST} is enabled, spawns 50 units from
 * the Comms Buffer Satellite's initial orbit position instead.
 */
export function getNarrativeShipSpawn(): {
  position: Vec3;
  rotation: Vec3;
  skipDock?: boolean;
} {
  if (DEV_COMMS_BUFFER_SATELLITE_TEST) {
    const marsPos = getPlanetPosition('Mars');
    const satX = marsPos.x + BUFFER_ORBIT_RADIUS * Math.cos(BUFFER_ORBIT_PHASE);
    const satZ = marsPos.z + BUFFER_ORBIT_RADIUS * Math.sin(BUFFER_ORBIT_PHASE);
    // Offset 50 units outward along the radial from Mars
    const dx = satX - marsPos.x;
    const dz = satZ - marsPos.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const shipX = satX + (dx / len) * 50;
    const shipZ = satZ + (dz / len) * 50;
    const yaw = Math.atan2(satX - shipX, satZ - shipZ);
    return {
      position: [shipX, 0, shipZ],
      rotation: [0, yaw, 0],
      skipDock: true,
    };
  }

  const primary = getNarrativePrimaryFieldOrigin();
  // Dock bay is at [300, -20, 0] relative to the primary field origin.
  const spawn = primary.clone().add(new THREE.Vector3(300, -20, 0));
  return {
    position: [spawn.x, spawn.y, spawn.z],
    rotation: [0, Math.PI, 0],
  };
}

export function getNarrativeMarsZoneCenter(target = new THREE.Vector3()): THREE.Vector3 {
  return getPlanetPosition('Mars', target);
}

export function getNarrativeMarsNormalTravelRadius(): number {
  // TODO: replace with a dynamic Mars altitude-derived radius.
  return 100;
}

export interface InventoryItemWithQuantity extends InventoryItem {
  quantity: number;
}

/** Starter hold for the narrative scene (skipped when loading a save). */
export const NARRATIVE_STARTER_CARGO: InventoryItemWithQuantity[] = [
  { ...inventoryItems.hullRepairPatch, quantity: 8 },
  { ...inventoryItems.emergencyBattery, quantity: 1 },
];

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
      position: [-100, 100, -60] as Vec3,
      intensity: 0.5,
      color: '#c96b28',
    },
  },
  extraContainersLocalToPrimaryField: EXTRA_CONTAINERS_LOCAL_TO_PRIMARY_FIELD,
  satelliteMissionConfig: SATELLITE_MISSION_CONFIG,
};
