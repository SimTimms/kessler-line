import * as THREE from 'three';
import { PLANETS } from '../components/Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE } from './solarConfig';

export interface RadiationZoneDef {
  id: string;
  label: string;
  /** If set, zone tracks this planet's position from gravityBodies each frame. */
  planetName?: string;
  /** Fixed world-space position — only used when planetName is absent. */
  position?: THREE.Vector3;
  radius: number; // world units
  intensity: number; // 0–1 scalar; drives hull drain rate and exposure depth
}

// ── Fixed position helper ──────────────────────────────────────────────────
// Computes a planet's initial world position using the same formula as useShipInit.
function planetInitialPos(name: string, offsetX = 0, offsetZ = 0): THREE.Vector3 {
  const p = PLANETS.find((pl) => pl.name === name);
  if (!p) return new THREE.Vector3(offsetX, 0, offsetZ);
  const x = Math.cos(p.initialAngle) * p.orbitRadius * SOLAR_SYSTEM_SCALE;
  const z = -Math.sin(p.initialAngle) * p.orbitRadius * SOLAR_SYSTEM_SCALE;
  return new THREE.Vector3(x + offsetX, 0, z + offsetZ);
}

export const RADIATION_ZONES: RadiationZoneDef[] = [
  {
    id: 'jupiter-belt',
    label: 'Jupiter Radiation Belt',
    planetName: 'Jupiter',
    radius: 100000,
    intensity: 0.6,
  },
  {
    id: 'earth-cascade',
    label: 'Earth Exclusion Zone',
    planetName: 'Earth',
    radius: 80000,
    intensity: 0.4,
  },
  {
    id: 'saturn-rings',
    label: 'Saturn Ring Debris Field',
    planetName: 'Saturn',
    radius: 150000,
    intensity: 0.2,
  },
  {
    // Fixed position — a derelict near Jupiter's start zone, offset so it's reachable on foot
    id: 'derelict-reactor',
    label: 'Derelict — Reactor Leak',
    position: planetInitialPos('Jupiter', 120000, 80000),
    radius: 15000,
    intensity: 0.9,
  },
];

// Hull integrity drained per second per intensity unit when inside a zone
export const RADIATION_HULL_DRAIN_RATE = 3;
