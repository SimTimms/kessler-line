import { useRef } from 'react';
import * as THREE from 'three';
import { PLANETS } from '../components/Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE, ORBIT_ALTITUDE_MULTIPLIER } from '../config/solarConfig';
import {
  START_DISTANCE_FROM_PLANET,
  FUEL_STATION_ORBIT_SPEED,
  START_PLANET,
} from '../config/spawnConfig';
import { loadSlot, AUTOSAVE_SLOT } from '../context/SaveStore';
import { apply, savedQuaternionToEuler } from '../context/SaveManager';
import { shipPosRef } from '../context/ShipPos';
import { DEV_JUPITER_TEST, DEV_MARS_TEST } from '../config/debugConfig';

export interface ShipInitResult {
  shipInitPos: [number, number, number];
  shipInitRot: [number, number, number];
  fuelStationOrbitRadius: number;
  fuelStationOrbitSpeed: number;
}

export function useShipInit(): ShipInitResult {
  const startPlanet = PLANETS.find((p) => p.name === START_PLANET);

  const startPlanetX = startPlanet
    ? Math.cos(startPlanet.initialAngle) * startPlanet.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const startPlanetZ = startPlanet
    ? -Math.sin(startPlanet.initialAngle) * startPlanet.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;

  const defaultStart: [number, number, number] = [
    startPlanetX + START_DISTANCE_FROM_PLANET,
    0,
    startPlanetZ,
  ];

  const startDirection = new THREE.Vector3(
    startPlanetX - defaultStart[0],
    0,
    startPlanetZ - defaultStart[2]
  ).normalize();
  const startYaw = Math.atan2(startDirection.x, startDirection.z);

  const didInitRef = useRef(false);
  const savedInitRef = useRef<{
    position: [number, number, number];
    rotation: [number, number, number];
  } | null>(null);

  if (!didInitRef.current) {
    const savedData = DEV_JUPITER_TEST || DEV_MARS_TEST ? null : loadSlot(AUTOSAVE_SLOT);
    if (savedData) {
      apply(savedData);
      savedInitRef.current = {
        position: savedData.position,
        rotation: savedQuaternionToEuler(savedData.quaternion),
      };
    } else {
      shipPosRef.current.set(...defaultStart);
    }
    didInitRef.current = true;
  }

  const neptuneWorldRadius = (startPlanet?.radius ?? 0) * SOLAR_SYSTEM_SCALE;

  return {
    shipInitPos: savedInitRef.current?.position ?? defaultStart,
    shipInitRot: savedInitRef.current?.rotation ?? ([0, startYaw, 0] as [number, number, number]),
    fuelStationOrbitRadius: neptuneWorldRadius * (1 + ORBIT_ALTITUDE_MULTIPLIER),
    fuelStationOrbitSpeed: FUEL_STATION_ORBIT_SPEED,
  };
}
