// Mutable positions written every frame by orbit components in the main Canvas,
// read every frame by SolarPlanetDot components in the mini-map Canvas.
// Positions are world-space X/Z (Y is ignored by the top-down mini-map view).
export const solarPlanetPositions: Record<string, { x: number; z: number }> = {};

// Live world-space position of the orbiting fuel station.
export const fuelStationWorldPos: { x: number; z: number } = { x: 0, z: 0 };
