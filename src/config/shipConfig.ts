// ── Ship physics ─────────────────────────────────────────────────────────
/** Linear thrust acceleration (units per second²). */
export const THRUST = 2.2;
/** Yaw angular acceleration (radians per second²). */
export const YAW_THRUST = 1.0;
/** Bounding sphere radius for collision detection (world units). */
export const SHIP_RADIUS = 3;
/** Collision restitution: 0 = dead stop, 1 = fully elastic. */
export const RESTITUTION = 0.4;
/** Global cap on thrust multiplier (player slider and autopilot). */
export const MAX_THRUST_MULTIPLIER = 3;
/** Duration of the hull-impact visual pulse in milliseconds. */
export const SHIP_IMPACT_PULSE_MS = 1200;

// ── Docking port ─────────────────────────────────────────────────────────
/** Detection sphere radius at the nose docking port (world units). */
export const DOCKING_PORT_RADIUS = 2;
/** Local +Z distance from ship center to the nose docking port. */
export const DOCKING_PORT_LOCAL_Z = 11;

// ── Main engine positions ─────────────────────────────────────────────────
/** Distance threshold for a railgun hit to register on a main engine. */
export const MAIN_ENGINE_HIT_RADIUS = 2.5;
/** Local position of the port main engine (reverseA). XYZ in ship-local space. */
export const MAIN_ENGINE_LOCAL_POS_A: [number, number, number] = [0, 1, -8.5];
/** Local position of the starboard main engine (reverseB). XYZ in ship-local space. */
export const MAIN_ENGINE_LOCAL_POS_B: [number, number, number] = [0, 1, -8.5];

// ── Physics step ─────────────────────────────────────────────────────────
/** Cross-torque scale applied when one engine is disabled during reverse thrust. */
export const ENGINE_TORQUE_SCALE = 0.15;
/** Exponential smoothing time constant for render-position lerp (higher = snappier). */
export const RENDER_SMOOTHING = 14;

// ── Thruster point light ─────────────────────────────────────────────────
/** Local position of the thruster point light (behind the ship). */
export const THRUSTER_LIGHT_POSITION: [number, number, number] = [0, 0, -14];
/** Color of the thruster exhaust glow. */
export const THRUSTER_LIGHT_COLOR = '#88ccff';
/** Thruster light range (world units). */
export const THRUSTER_LIGHT_DISTANCE = 40;
/** Thruster light decay exponent. */
export const THRUSTER_LIGHT_DECAY = 2;

// ── Player ship roster ────────────────────────────────────────────────────
export interface PlayerShip {
  name: string;
  mission: string;
}

/** 20 possible player vessels. One is selected at game start. */
export const PLAYER_SHIPS: PlayerShip[] = [
  { name: 'Black Kestrel', mission: 'En route to Neptune' },
  { name: 'Pale Meridian', mission: 'Salvage run, outer belt' },
  { name: 'Iron Vagrant', mission: 'Ore delivery, Titan Station' },
  { name: 'Copper Drift', mission: 'Supply run, Kuiper outpost' },
  { name: 'Silent Margin', mission: 'Prospecting, Uranus L4' },
  { name: 'Dust Runner', mission: 'Contract haul, Ceres' },
  { name: 'Far Passage', mission: 'Resupply, Periphery depot' },
  { name: 'The Sullen Moon', mission: 'Salvage, derelict ring' },
  { name: "Widow's Wake", mission: 'Medical cargo, Europa' },
  { name: 'Cold Meridian', mission: 'Ice extraction, Saturn' },
  { name: 'Rust Cardinal', mission: 'Scrap haul, Jupiter L5' },
  { name: 'Phantom Haul', mission: 'Classified freight, outer route' },
  { name: 'The Iron Tide', mission: 'Convoy escort, Neptune lane' },
  { name: 'Distant Shore', mission: 'Long-range survey, Eris' },
  { name: 'Cinder Hawk', mission: 'Emergency resupply, Triton' },
  { name: 'The Leaden Sky', mission: 'Refugee transport, Ganymede' },
  { name: 'Vagrant Star', mission: 'Fuel transfer, deep belt' },
  { name: 'Ashen Light', mission: 'Data courier, inner relay' },
  { name: 'The Broken Compass', mission: 'Search and salvage, Sedna approach' },
  { name: 'Last Waypoint', mission: 'Independent freight, no fixed route' },
];

/** Current session ship — will be randomly selected from PLAYER_SHIPS in a future update. */
export const CURRENT_SHIP: PlayerShip =
  PLAYER_SHIPS[Math.floor(Math.random() * PLAYER_SHIPS.length)];
