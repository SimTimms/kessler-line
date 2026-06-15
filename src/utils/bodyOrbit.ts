import * as THREE from 'three';
import { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';
import { getPlanetPosition } from '../config/planetPosition';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';

/** Planet name from {@link PLANETS} or `'Sun'` for heliocentric orbits around the origin. */
export type OrbitBodyName = 'Sun' | string;

export type BodyOrbitSpeedMode = 'tangential' | 'angular';

export interface BodyOrbitParams {
  body: OrbitBodyName;
  /** World-space distance from the body center. */
  radius: number;
  /**
   * Orbital speed. With `speedMode: 'tangential'` (default), units per second along
   * the orbit path. With `speedMode: 'angular'`, radians per second.
   */
  speed: number;
  speedMode?: BodyOrbitSpeedMode;
  /**
   * Starting angle on the XZ orbit plane, in degrees.
   * 0° = +X, 90° = +Z (counterclockwise when viewed from above).
   */
  initialAngleDeg?: number;
  /** Optional fixed Y offset from the body center (world units). */
  yOffset?: number;
}

const _center = new THREE.Vector3();

/** Angular speed in radians per second. */
export function getBodyOrbitAngularSpeed(params: BodyOrbitParams): number {
  if (params.speedMode === 'angular') return params.speed;
  if (params.radius <= 0) return 0;
  return params.speed / params.radius;
}

export function getBodyOrbitInitialAngleRad(params: BodyOrbitParams): number {
  return ((params.initialAngleDeg ?? 0) * Math.PI) / 180;
}

/** World-space center of a solar body (live planet position when available). */
export function getBodyCenterWorld(body: OrbitBodyName, target = new THREE.Vector3()): THREE.Vector3 {
  if (body === 'Sun') return target.set(0, 0, 0);

  const local = solarPlanetPositions[body];
  if (local) {
    return target.set(local.x * SOLAR_SYSTEM_SCALE, 0, local.z * SOLAR_SYSTEM_SCALE);
  }

  return getPlanetPosition(body, target);
}

/** Offset from the body center at a given orbit angle (XZ plane, world units). */
export function getBodyOrbitOffset(
  angleRad: number,
  radius: number,
  yOffset = 0,
  target = new THREE.Vector3()
): THREE.Vector3 {
  return target.set(Math.cos(angleRad) * radius, yOffset, Math.sin(angleRad) * radius);
}

/** World-space position on a circular orbit at `elapsedTime` seconds. */
export function computeBodyOrbitWorldPosition(
  params: BodyOrbitParams,
  elapsedTime: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const angle =
    getBodyOrbitInitialAngleRad(params) + getBodyOrbitAngularSpeed(params) * elapsedTime;
  const offset = getBodyOrbitOffset(angle, params.radius, params.yOffset ?? 0);
  const center = getBodyCenterWorld(params.body, _center);
  return target.set(center.x + offset.x, center.y + offset.y, center.z + offset.z);
}
