import * as THREE from 'three';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import {
  TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE,
  TUTORIAL_ORBITAL_CAMERA_ZOOM_MAX,
} from '../../config/tutorialOrbitalConfig';
import { ORBIT_ALTITUDE_MULTIPLIER, SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../../config/particleConfig';
import { getPlanetWorldRadius, getShipSpawnInPlanetOrbit } from '../../config/planetPosition';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { shipPosRef } from '../../context/ShipPos';
import { MINERAL_ASTEROID_HAIL_TREE_ID } from '../../narrative/broadcastDialogues';
import type { BodyOrbitParams } from '../../utils/bodyOrbit';

const SANDBOX_SPAWN_PLANET = 'Neptune';
const spawnWorldRadius = getPlanetWorldRadius(SANDBOX_SPAWN_PLANET);

/** Altitude above spawn planet surface, in world-radius multiples. */
const SANDBOX_SPAWN_ALTITUDE = spawnWorldRadius * ORBIT_ALTITUDE_MULTIPLIER * 2.75;

const defaultSpawn = getShipSpawnInPlanetOrbit(SANDBOX_SPAWN_PLANET, SANDBOX_SPAWN_ALTITUDE);

const sandboxShipInitialPosition = defaultSpawn.position;
const sandboxShipInitialYaw = Math.atan2(defaultSpawn.orbitTangent[0], defaultSpawn.orbitTangent[2]);
const sandboxInitialVelocity: [number, number, number] = [
  defaultSpawn.orbitTangent[0] * defaultSpawn.circularOrbitSpeed,
  0,
  defaultSpawn.orbitTangent[2] * defaultSpawn.circularOrbitSpeed,
];

type SandboxSpawnPreset = {
  id: string;
  planet: string;
  altitudeMultiplier: number;
};

export type SandboxSpawn = {
  presetId: string;
  planet: string;
  position: [number, number, number];
  yaw: number;
  rotation: [number, number, number];
  velocity: [number, number, number];
  orbitRadius: number;
  surfaceClearance: number;
};

const SANDBOX_DEFAULT_SPAWN_PRESET: SandboxSpawnPreset = {
  id: 'neptune-long-haul',
  planet: 'Neptune',
  altitudeMultiplier: 1.75,
};

function spawnFromPreset(preset: SandboxSpawnPreset): SandboxSpawn {
  const worldRadius = getPlanetWorldRadius(preset.planet);
  const altitude = worldRadius * ORBIT_ALTITUDE_MULTIPLIER * preset.altitudeMultiplier;
  const spawn = getShipSpawnInPlanetOrbit(preset.planet, altitude);
  const spawnYaw = Math.atan2(spawn.orbitTangent[0], spawn.orbitTangent[2]);

  return {
    presetId: preset.id,
    planet: preset.planet,
    position: spawn.position,
    yaw: spawnYaw,
    rotation: [0, spawnYaw, 0],
    velocity: [
      spawn.orbitTangent[0] * spawn.circularOrbitSpeed,
      0,
      spawn.orbitTangent[2] * spawn.circularOrbitSpeed,
    ],
    orbitRadius: spawn.distanceFromCenter,
    surfaceClearance: spawn.altitudeAboveSurface,
  };
}

/** Always start sandbox near Neptune. */
export function createSandboxSpawn(): SandboxSpawn {
  return spawnFromPreset(SANDBOX_DEFAULT_SPAWN_PRESET);
}

const TUTORIAL_FOLLOW_OFFSET: [number, number, number] = [-40, 50, 50];

/** Kinematic orbit for sandbox props (e.g. asteroid belt objects near Mars). */
export const SANDBOX_ASTEROID_ORBIT: BodyOrbitParams = {
  body: 'Mars',
  radius: 100000,
  speed: 200,
  speedMode: 'tangential',
  initialAngleDeg: 120,
};

/** Kinematic orbit for sandbox props (e.g. asteroid belt objects near Mars). */
export const SANDBOX_FOG_ORBIT: BodyOrbitParams = {
  body: 'Mars',
  radius: 100000,
  speed: 0,
  speedMode: 'angular',
  initialAngleDeg: 120,
};

/** Kinematic orbit for sandbox props (e.g. asteroid belt objects near Mars). */
export const SANDBOX_BATTLESHIP_ORBIT: BodyOrbitParams = {
  body: 'Mars',
  radius: 100000,
  speed: 0,
  speedMode: 'angular',
  initialAngleDeg: 120,
};
/** Radio contact for the sandbox mineral asteroid (position follows the orbiting mesh). */
export const SANDBOX_ASTEROID_RADIO: RadioBroadcastDef = {
  id: 'mineral-asteroid',
  label: 'AST-47718',
  position: [0, 0, 0],
  hailRange: 100_000,
  dialogueTreeId: MINERAL_ASTEROID_HAIL_TREE_ID,
  dialogue: [
    'AUTOMATED BEACON — AST-47718.',
    'MINERAL SCAN: IRON ORE SIGNATURE DETECTED.',
    'NO CREW RESPONSE. SIGNAL REPEATING.',
  ],
};

const spawnCameraPosition = new THREE.Vector3(...sandboxShipInitialPosition).add(
  new THREE.Vector3(...TUTORIAL_FOLLOW_OFFSET)
);

/** Sync module-level ship position (and optional R3F group) to the selected sandbox spawn. */
function applySandboxSpawn(spawn: SandboxSpawn, group?: THREE.Group | null): THREE.Vector3 {
  shipPosRef.current.set(...spawn.position);
  if (group) {
    group.position.set(...spawn.position);
    group.rotation.set(...spawn.rotation);
  }
  return shipPosRef.current;
}

export const SANDBOX_CONFIG = {
  fogColor: '#000000',
  lightColor: '#FFFFFF',
  spawnCameraPosition,
  tutorialFollowOffset: TUTORIAL_FOLLOW_OFFSET,
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  applySandboxSpawn,
  createSandboxSpawn,
  createRandomSandboxSpawn: createSandboxSpawn,
  tutorialCameraHoldMaxAltitude: TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE,
  tutorialCameraZoomMax: TUTORIAL_ORBITAL_CAMERA_ZOOM_MAX,
  tutorialShipInitialPosition: sandboxShipInitialPosition,
  tutorialShipInitialRotation: [0, sandboxShipInitialYaw, 0] as [number, number, number],
  sandboxInitialVelocity,
  tutorialShipOrbitRadius: defaultSpawn.distanceFromCenter,
  tutorialShipSurfaceClearance: defaultSpawn.altitudeAboveSurface,
  planetImpactCameraHoldMaxAltitude: TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE,
  solarSystemScale: SOLAR_SYSTEM_SCALE,
  shipParticleCount: SHIP_PARTICLE_COUNT,
  shipParticleSpeedMin: SHIP_PARTICLE_SPEED_MIN,
  shipParticleSpeedMax: SHIP_PARTICLE_SPEED_MAX,
};
