import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { shipPosRef } from '../context/ShipPos';
import { KM_PER_UNIT, SPEED_OF_LIGHT_KM_S, GAME_TIME_RATE } from '../config/commsConfig';

// Returns one-way signal delay in real milliseconds from the ship to a named destination.
// destinationId should match a key in solarPlanetPositions (e.g. 'Earth', 'Neptune').
export function computeOneWayDelayMs(destinationId: string): number {
  const dest = solarPlanetPositions[destinationId];
  if (!dest) return 0;

  const ship = shipPosRef.current;
  const dx = ship.x - dest.x;
  const dz = ship.z - dest.z;
  const distUnits = Math.sqrt(dx * dx + dz * dz);

  const distKm = distUnits * KM_PER_UNIT;
  const lightTravelGameSecs = distKm / SPEED_OF_LIGHT_KM_S;
  const realSecs = lightTravelGameSecs / GAME_TIME_RATE;

  return realSecs * 1000; // ms
}

// Returns the ship's distance to a destination in a human-readable AU string.
export function computeDistanceAu(destinationId: string): string {
  const dest = solarPlanetPositions[destinationId];
  if (!dest) return '?';

  const ship = shipPosRef.current;
  const dx = ship.x - dest.x;
  const dz = ship.z - dest.z;
  const distUnits = Math.sqrt(dx * dx + dz * dz);
  const distKm = distUnits * KM_PER_UNIT;
  const au = distKm / 149_597_871; // 1 AU in km

  return au.toFixed(2) + ' AU';
}

// Formats a real millisecond duration as a game-time string ("4h 23m", "12m", etc.).
export function formatGameDuration(ms: number): string {
  const gameSecs = (ms / 1000) * GAME_TIME_RATE;
  const totalMins = Math.round(gameSecs / 60);
  if (totalMins < 1) return '<1m';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
