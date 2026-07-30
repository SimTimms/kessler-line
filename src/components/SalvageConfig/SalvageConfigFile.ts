import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import {
  SALVAGE_DOCK_CONFIG,
  SALVAGE_DROPOFF_DOCK_CONFIG,
} from '../../config/docks/salvageDockConfig';
import { CARGO_CONTAINER_DOCK } from '../../config/docks/cargoContainerDockConfig';
import {
  SALVAGE_DROPOFF_PAD_ID,
  SALVAGE_DROPOFF_PAD_LABEL,
} from '../../config/salvageDropOffConfig';
import type { DockConfig } from '../../config/dockConfig';
import * as THREE from 'three';

type Vec3 = [number, number, number];

/** Warm rust / ochre palette — dust cloud and scene lights share this look. */
export const SALVAGE_ATMOSPHERE_COLORS = [
  new THREE.Color('#d4843a'),
  new THREE.Color('#c96b28'),
  new THREE.Color('#e8a050'),
] as const;

//dark blue atmosphere for drones
export const DRONE_ATMOSPHERE_COLORS = [
  new THREE.Color('#0000aa'),
  new THREE.Color('#000000'),
  new THREE.Color('#000000'),
] as const;

export const SalvageConfigData = {
  cameraPosition: [0, 40, 100] as Vec3,
  cameraTarget: [0, 0, 0] as Vec3,
  gridSize: 1200,
  gridDivisions: 1,
  playerShipUrl: '/shuttle-low-british.glb',
  playerShipScale: 1,
  landingPadScale: 3,
  salvageBayScale: 2,
  landingPadThreshold: 28,
  /** Ship berth ~300 units off world origin. */
  dock: {
    id: 'salvage-berth',
    label: 'Salvage Berth',
    position: [300, -20, 0] as Vec3,
    dock: SALVAGE_DOCK_CONFIG as DockConfig,
  },
  /** Crate-only intake pad near the berth (shared depot inventory). */
  dropOffPad: {
    id: SALVAGE_DROPOFF_PAD_ID,
    label: SALVAGE_DROPOFF_PAD_LABEL,
    position: [380, -20, 130] as Vec3,
    dock: SALVAGE_DROPOFF_DOCK_CONFIG as DockConfig,
  },
  /** Clonable cargo-container dock near spawn. */
  cargoContainer: {
    id: 'salvage-cargo-a',
    label: 'Salvage Cargo A',
    position: [40, 0, 25] as Vec3,
    rotation: [0, 0.6, 0] as Vec3,
    scale: 1,
    dock: CARGO_CONTAINER_DOCK as DockConfig,
  },
  scene: {
    fogColor: '#0a0604',
    canvasNear: CANVAS_NEAR,
    canvasFar: CANVAS_FAR,
    toneMappingExposure: TONE_MAPPING_EXPOSURE,
    ambientIntensity: 0.15,
    keyLight: {
      position: [180, 100, 80] as Vec3,
      intensity: 2,
      color: '#e8a050',
    },
    fillLight: {
      position: [-100, 40, -60] as Vec3,
      intensity: 2,
      color: '#c96b28',
    },
  },
  dustCloud: {
    radius: 2200,
    particleSize: 280,
    radialSpread: 9,
    yInitial: -160,
    opacity: 0.12,
    colors: SALVAGE_ATMOSPHERE_COLORS,
  },
  /**
   * Decorative asteroid field — 30 rocks on a ~500-unit grid at Y = -300,
   * each with a distinct yaw.
   */
  asteroids: buildSalvageAsteroidField(),
  /** Mineable rocks authored with the field (local to SalvageField origin). */
  mineableAsteroids: [
    {
      id: 'salvage-asteroid-near',
      position: [45, 0, -55] as Vec3,
      rotation: [0.2, 0.8, 0.1] as Vec3,
      scale: 18,
      label: 'Mineral Asteroid',
    },
    {
      id: 'salvage-asteroid-a',
      /** Relative to the ship berth group. */
      position: [-150, -480, -70] as Vec3,
      rotation: [0, 0, 0] as Vec3,
      scale: 260,
      label: 'Mineral Asteroid',
      parent: 'dock' as const,
    },
  ],
  /** Non-player mothership (low-res garbage scow). */
  backgroundScow: {
    url: '/space_garbage_truck-low.glb',
    position: [120, 0, 140] as Vec3,
    rotation: [0, -0.8, 0] as Vec3,
    scale: 6,
  },
  /** Scavenger drones that patrol the field using the low-res scow mesh. */
  scowDroneFleet: {
    url: '/space_garbage_truck-low.glb',
    count: 8,
    scale: 0.45,
    spawnCenter: [120, -600, 140] as Vec3,
    spawnRadius: 2060,
    waypoints: [
      [40, 0, 25], // cargo container
      [300, 0, 0], // landing pad / berth
      [300, 0, 80], // salvage intake pad
      [0, 0, 0], // player spawn vicinity
      [-80, 0, 120],
      [200, 0, -80],
    ] as Vec3[],
  },
};

function buildSalvageAsteroidField(): Array<{
  position: Vec3;
  rotation: Vec3;
  scale: number;
}> {
  const count = 20;
  const spacing = 500;
  const cols = 6;
  const rows = 5;

  const asteroids: Array<{ position: Vec3; rotation: Vec3; scale: number }> = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * spacing + Math.random() * 100;
    const z = (row - (rows - 1) / 2) * spacing + Math.random() * 100;
    const y = -1300 + Math.random() * 1000;
    // Deterministic varied yaw so the field doesn't look tiled.
    const rotY = ((i * 2.399963) % (Math.PI * 2)) as number;
    asteroids.push({
      position: [x, y, z],
      rotation: [0, rotY, 0],
      scale: 300 * Math.random(),
    });
  }

  return asteroids;
}
