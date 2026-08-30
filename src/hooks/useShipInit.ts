import { useRef } from 'react';
import { ORBIT_ALTITUDE_MULTIPLIER, SOLAR_SYSTEM_SCALE } from '../config/solarConfig';
import {
  START_DISTANCE_FROM_PLANET,
  FUEL_STATION_ORBIT_SPEED,
  START_PLANET,
} from '../config/spawnConfig';
import { getPlanet } from '../components/Planets/SolarSystem';
import { getShipSpawnNearPlanet } from '../config/planetPosition';
import { loadSlot, AUTOSAVE_SLOT } from '../context/SaveStore';
import { apply, savedQuaternionToEuler } from '../context/SaveManager';
import { shipPosRef } from '../context/ShipPos';
import { DEV_JUPITER_TEST, DEV_MARS_TEST } from '../config/debugConfig';
import { resetCO2Filter } from '../context/CO2FilterStore';
import { resetCommsBuffer } from '../context/CommsBufferStore';
import { resetEmergencyBattery } from '../context/EmergencyBatteryStore';

export interface ShipInitResult {
  shipInitPos: [number, number, number];
  shipInitRot: [number, number, number];
  fuelStationOrbitRadius: number;
  fuelStationOrbitSpeed: number;
}

function resolveStartPlanetName(): string {
  if (DEV_MARS_TEST) return 'Mars';
  if (DEV_JUPITER_TEST) return 'Jupiter';
  return START_PLANET;
}

export function useShipInit(): ShipInitResult {
  const startPlanetName = resolveStartPlanetName();
  const startPlanet = getPlanet(startPlanetName);
  const { position: defaultStart, yaw: startYaw } = getShipSpawnNearPlanet(
    startPlanetName,
    START_DISTANCE_FROM_PLANET,
  );

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
      resetCO2Filter();
      resetCommsBuffer();
      resetEmergencyBattery();
    }
    didInitRef.current = true;
  }

  const startPlanetWorldRadius = (startPlanet?.radius ?? 0) * SOLAR_SYSTEM_SCALE;

  return {
    shipInitPos: savedInitRef.current?.position ?? defaultStart,
    shipInitRot: savedInitRef.current?.rotation ?? ([0, startYaw, 0] as [number, number, number]),
    fuelStationOrbitRadius: startPlanetWorldRadius * (1 + ORBIT_ALTITUDE_MULTIPLIER),
    fuelStationOrbitSpeed: FUEL_STATION_ORBIT_SPEED,
  };
}
