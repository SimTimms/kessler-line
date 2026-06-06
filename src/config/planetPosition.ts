import * as THREE from 'three';
import { getPlanet } from '../components/Planets/SolarSystem';
import {
  DEFAULT_PLANET_SURFACE_GRAVITY,
  PLANET_SOI_MULTIPLIER,
  SOLAR_SYSTEM_SCALE,
} from './solarConfig';

/** World-space surface radius for a planet (local radius × SOLAR_SYSTEM_SCALE). */
export function getPlanetWorldRadius(planetName: string): number {
  const planet = getPlanet(planetName);
  return (planet?.radius ?? 0) * SOLAR_SYSTEM_SCALE;
}

/** World-space position of a planet at game start (before OrbitingPlanet's first tick). */
export function getPlanetPosition(planetName: string, target = new THREE.Vector3()): THREE.Vector3 {
  const planet = getPlanet(planetName);
  if (!planet) return target.set(0, 0, 0);
  const r = planet.orbitRadius * SOLAR_SYSTEM_SCALE;
  return target.set(Math.cos(planet.initialAngle) * r, 0, -Math.sin(planet.initialAngle) * r);
}

export interface ShipSpawnNearPlanet {
  position: [number, number, number];
  yaw: number;
}

/**
 * Place the ship `distanceFromCenter` world units from the planet, along the
 * Sun→planet radial (outward from the Sun). Yaw faces back toward the planet.
 */
export function getShipSpawnNearPlanet(
  planetName: string,
  distanceFromCenter: number,
): ShipSpawnNearPlanet {
  const planetPos = getPlanetPosition(planetName);
  const radial = planetPos.clone().setY(0);
  if (radial.lengthSq() < 1e-6) {
    radial.set(1, 0, 0);
  } else {
    radial.normalize();
  }

  const shipPos = planetPos.clone().add(radial.multiplyScalar(distanceFromCenter));
  const towardPlanet = planetPos.clone().sub(shipPos).setY(0).normalize();
  const yaw = Math.atan2(towardPlanet.x, towardPlanet.z);

  return {
    position: [shipPos.x, shipPos.y, shipPos.z],
    yaw,
  };
}

export interface PlanetOrbitSpawn extends ShipSpawnNearPlanet {
  distanceFromCenter: number;
  altitudeAboveSurface: number;
  circularOrbitSpeed: number;
  orbitTangent: [number, number, number];
}

/**
 * Spawn at `altitudeAboveSurface` world units above the planet surface (scales
 * with SOLAR_SYSTEM_SCALE). Includes prograde circular-orbit speed at that radius.
 */
export function getShipSpawnInPlanetOrbit(
  planetName: string,
  altitudeAboveSurface: number,
): PlanetOrbitSpawn {
  const worldRadius = getPlanetWorldRadius(planetName);
  const planet = getPlanet(planetName);
  const surfaceGravity = planet?.surfaceGravity ?? DEFAULT_PLANET_SURFACE_GRAVITY;
  const soiRadius = worldRadius * PLANET_SOI_MULTIPLIER;
  const distanceFromCenter = Math.min(worldRadius + altitudeAboveSurface, soiRadius * 0.95);

  const planetPos = getPlanetPosition(planetName);
  const radial = planetPos.clone().setY(0);
  if (radial.lengthSq() < 1e-6) {
    radial.set(1, 0, 0);
  } else {
    radial.normalize();
  }

  const shipPos = planetPos.clone().add(radial.multiplyScalar(distanceFromCenter));
  const towardPlanet = planetPos.clone().sub(shipPos).setY(0).normalize();
  const yaw = Math.atan2(towardPlanet.x, towardPlanet.z);
  const tangent = new THREE.Vector3(-radial.z, 0, radial.x).normalize();

  const mu = surfaceGravity * worldRadius * worldRadius;
  const circularOrbitSpeed = Math.sqrt(mu / distanceFromCenter);

  return {
    position: [shipPos.x, shipPos.y, shipPos.z],
    yaw,
    distanceFromCenter,
    altitudeAboveSurface: distanceFromCenter - worldRadius,
    circularOrbitSpeed,
    orbitTangent: [tangent.x, tangent.y, tangent.z],
  };
}
