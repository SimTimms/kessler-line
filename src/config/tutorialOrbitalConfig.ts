import * as THREE from 'three';
import { LUNAR_MOON_RADIUS } from './lunarLandscapeConfig';
import { MOON_SURFACE_GRAVITY } from './moonConfig';
import { ORBIT_ALTITUDE_MULTIPLIER } from './solarConfig';
import { shipPosRef } from '../context/ShipPos';

/** Visual sun radius in the orbital tutorial. */
export const TUTORIAL_ORBITAL_SUN_RADIUS = 2000_500;

export const TUTORIAL_ORBITAL_SUN_LIGHT_INTENSITY = 200_000;
export const TUTORIAL_ORBITAL_SUN_LIGHT_DISTANCE = 400_000;

/** Sun orbits the moon (moon at world origin). */
export const TUTORIAL_ORBITAL_SUN_ORBIT_RADIUS = LUNAR_MOON_RADIUS * 7000;

export const TUTORIAL_ORBITAL_SUN_ORBIT_SPEED = 0.00006;

export const TUTORIAL_ORBITAL_SUN_SOI_RADIUS = TUTORIAL_ORBITAL_SUN_ORBIT_RADIUS * 1.4;

/**
 * Spawn altitude above the moon surface only — where the ship is placed at tutorial start.
 * Independent of {@link TUTORIAL_ORBITAL_IDEAL_ORBIT_ALTITUDE} (green ring / autopilot target).
 */
export const TUTORIAL_ORBITAL_SHIP_SURFACE_CLEARANCE = 40_300;

/**
 * Target stable circular orbit above the moon surface (green trajectory ring, Nav HUD
 * bracket, autopilot arrival). Not tied to spawn clearance.
 */
export const TUTORIAL_ORBITAL_IDEAL_ORBIT_ALTITUDE = LUNAR_MOON_RADIUS * ORBIT_ALTITUDE_MULTIPLIER;

/** Distance from moon centre to spawn (surface radius + clearance). */
export const TUTORIAL_ORBITAL_SHIP_ORBIT_RADIUS =
  LUNAR_MOON_RADIUS + TUTORIAL_ORBITAL_SHIP_SURFACE_CLEARANCE;

/** Ship spawn on +X; gameplay stays in the XZ plane (Y always 0). */
export const TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION: [number, number, number] = [
  TUTORIAL_ORBITAL_SHIP_ORBIT_RADIUS,
  0,
  20000,
];

/** Follow-camera max zoom — must exceed clearance or the view looks identical at high altitudes. */
export const TUTORIAL_ORBITAL_CAMERA_ZOOM_MAX = TUTORIAL_ORBITAL_SHIP_SURFACE_CLEARANCE + 20_000;

/**
 * When inbound below this altitude, the follow camera stops moving closer to the
 * primary body (stays on this surface-altitude shell) but keeps looking at the ship.
 */
export const TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE = 30_000;

const MOON_MU = MOON_SURFACE_GRAVITY * LUNAR_MOON_RADIUS * LUNAR_MOON_RADIUS;

/** Tangential speed for a circular orbit at the tutorial spawn radius. */
export function getTutorialOrbitalSpawnTangentSpeed(): number {
  return Math.sqrt(MOON_MU / TUTORIAL_ORBITAL_SHIP_ORBIT_RADIUS);
}

export function getTutorialOrbitalSpawnWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
  return target.set(
    TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION[0],
    TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION[1],
    TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION[2]
  );
}

/** Sync module-level ship position (and optional R3F group) to the configured spawn. */
export function applyTutorialOrbitalSpawn(group?: THREE.Group | null): THREE.Vector3 {
  getTutorialOrbitalSpawnWorldPosition(shipPosRef.current);
  if (group) {
    group.position.set(...TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION);
  }
  return shipPosRef.current;
}
