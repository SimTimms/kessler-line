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

const SANDBOX_SPAWN_PLANET = 'Mars';
const spawnWorldRadius = getPlanetWorldRadius(SANDBOX_SPAWN_PLANET);

/** Altitude above Mars surface, in multiples of Mars world radius — scales with SOLAR_SYSTEM_SCALE. */
const SANDBOX_SPAWN_ALTITUDE = spawnWorldRadius * ORBIT_ALTITUDE_MULTIPLIER * 2.75;

const marsSpawn = getShipSpawnInPlanetOrbit(SANDBOX_SPAWN_PLANET, SANDBOX_SPAWN_ALTITUDE);

const sandboxShipInitialPosition = marsSpawn.position;
const sandboxShipInitialYaw = marsSpawn.yaw;
const sandboxInitialVelocity: [number, number, number] = [
  marsSpawn.orbitTangent[0] * marsSpawn.circularOrbitSpeed,
  0,
  marsSpawn.orbitTangent[2] * marsSpawn.circularOrbitSpeed,
];

const TUTORIAL_FOLLOW_OFFSET: [number, number, number] = [-40, 50, 50];

/** Kinematic orbit for sandbox props (e.g. asteroid belt objects near Mars). */
export const SANDBOX_ASTEROID_ORBIT: BodyOrbitParams = {
  body: 'Mars',
  radius: 100000,
  speed: 200,
  speedMode: 'tangential',
  initialAngleDeg: 160,
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

/** Sync module-level ship position (and optional R3F group) to the Mars spawn. */
function applySandboxSpawn(group?: THREE.Group | null): THREE.Vector3 {
  shipPosRef.current.set(...sandboxShipInitialPosition);
  if (group) {
    group.position.set(...sandboxShipInitialPosition);
    group.rotation.set(0, sandboxShipInitialYaw, 0);
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
  tutorialCameraHoldMaxAltitude: TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE,
  tutorialCameraZoomMax: TUTORIAL_ORBITAL_CAMERA_ZOOM_MAX,
  tutorialShipInitialPosition: sandboxShipInitialPosition,
  tutorialShipInitialRotation: [0, sandboxShipInitialYaw, 0] as [number, number, number],
  sandboxInitialVelocity,
  tutorialShipOrbitRadius: marsSpawn.distanceFromCenter,
  tutorialShipSurfaceClearance: marsSpawn.altitudeAboveSurface,
  planetImpactCameraHoldMaxAltitude: TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE,
  solarSystemScale: SOLAR_SYSTEM_SCALE,
  shipParticleCount: SHIP_PARTICLE_COUNT,
  shipParticleSpeedMin: SHIP_PARTICLE_SPEED_MIN,
  shipParticleSpeedMax: SHIP_PARTICLE_SPEED_MAX,
};
