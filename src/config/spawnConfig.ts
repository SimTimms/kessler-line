// ── Player spawn ─────────────────────────────────────────────────────────
/** Distance from Neptune's world position at game start (world units). */
export const START_DISTANCE_FROM_PLANET = 90_200;

// ── Static world positions ────────────────────────────────────────────────
/** Position of the origin docking bay (tutorial / debugging area). */
export const DOCKING_BAY_ORIGIN: [number, number, number] = [1000, 0, 100];
/** World-space centre of the starting asteroid cluster and nebula. */
export const START_ZONE_CENTER: [number, number, number] = [76000, -3000, -129376];

// ── Fuel station orbit ────────────────────────────────────────────────────
/** Angular speed of the fuel station orbit around Neptune (rad/s).
 *  Negative = prograde (same direction as planet rotation). */
export const FUEL_STATION_ORBIT_SPEED = -0.00005;

export const START_PLANET = 'Uranus';
