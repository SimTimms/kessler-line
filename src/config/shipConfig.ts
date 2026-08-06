// ── Ship physics ─────────────────────────────────────────────────────────
/** Linear thrust acceleration (units per second²). */
export const THRUST = 2.2;
/** Yaw angular acceleration (radians per second²). */
export const YAW_THRUST = 0.3;
/** Exponential yaw damping rate (1/s) to prevent runaway angular drift. */
export const YAW_DAMPING = 2.2;
/** Hard cap for yaw rate (radians/s). */
export const MAX_YAW_RATE = 0.9;
/** Bounding sphere radius for legacy point checks (docking helpers, etc.). */
export const SHIP_RADIUS = 3;
/** Oriented box half-extents used for ship hull collision + debug overlay. */
export const SHIP_BOX_HALF_EXTENTS: [number, number, number] = [7, 3, 17];
/**
 * Local axis the ship travels when thrusting forward.
 * Physics uses `local +Z` as a basis then applies −thrust, so flight nose is −Z.
 */
export const SHIP_FLIGHT_FORWARD_LOCAL: [number, number, number] = [0, 0, -1];

/** Default magazine size for the player ship (rounds). Configurable per ship. */
export const PLAYER_SHIP_AMMO_CAPACITY = 200;
/** Ammo loaded when the player ship spawns / resets. */
export const PLAYER_SHIP_AMMO_START = 60;
/**
 * Sample points in ship-local space approximating the hull volume.
 * Physics tests each sphere against obstacles so nose/tail contacts register.
 */
export const SHIP_COLLISION_SAMPLES: ReadonlyArray<{
  local: readonly [number, number, number];
  radius: number;
}> = [
  { local: [0, 0, 0], radius: 4 },
  { local: [0, 0, 14], radius: 3.5 },
  { local: [0, 0, -8], radius: 3.5 },
  { local: [0, 0, 7], radius: 3 },
  { local: [0, 0, -4], radius: 3 },
];
/** Collision restitution: 0 = dead stop, 1 = fully elastic. */
export const RESTITUTION = 0.4;
/** Global cap on thrust multiplier (player slider and autopilot). */
export const MAX_THRUST_MULTIPLIER = 50; // TODO: revert to 3
/**
 * While {@link KEY_THRUST_BOOST} is held, main engines burn at this multiplier
 * regardless of the thrust dial (dial is restored on release).
 */
export const THRUST_BOOST_MULTIPLIER = 20;
/** Yaw thruster authority / max rate scale while thrust boost is held. */
export const THRUST_BOOST_YAW_SCALE = 3;
/** Duration of the hull-impact visual pulse in milliseconds. */
export const SHIP_IMPACT_PULSE_MS = 1200;

// ── Visual maneuver lean (mesh only — physics stays level) ────────────────
/** Max bank into a yaw turn (radians). */
export const SHIP_LEAN_BANK_MAX_RAD = (12 * Math.PI) / 180;
/** Nose-down lean while thrusting forward (radians). */
export const SHIP_LEAN_PITCH_FWD_RAD = (2 * Math.PI) / 180;
/** Nose-up lean while thrusting reverse (radians). */
export const SHIP_LEAN_PITCH_REV_RAD = (2 * Math.PI) / 180;
/** How quickly lean eases toward the target / back to level (1/s). */
export const SHIP_LEAN_RESPONSE = 2.4;

// ── Docking port ─────────────────────────────────────────────────────────
/** Detection sphere radius at the nose docking port (world units). */
export const DOCKING_PORT_RADIUS = 2;
/** Local +Z distance from ship center to the nose docking port. */
export const DOCKING_PORT_LOCAL_Z = -19.6;
/**
 * Ship-local position of the nose docking port (matches Spaceship dockingPortRef).
 * When docking, this point is placed on the target bay's origin.
 */
export const SHIP_DOCKING_PORT_LOCAL: [number, number, number] = [
  0,
  -0.025,
  DOCKING_PORT_LOCAL_Z - 0.1,
];
/**
 * Dock-local offset for the ship root so {@link SHIP_DOCKING_PORT_LOCAL} lands on
 * the bay origin (port-to-port, not center-to-port).
 */
export const SHIP_DOCK_ATTACH_OFFSET_LOCAL: [number, number, number] = [
  -SHIP_DOCKING_PORT_LOCAL[0],
  -SHIP_DOCKING_PORT_LOCAL[1],
  -SHIP_DOCKING_PORT_LOCAL[2],
];
/** After undock, ship docking port ignores capture for this long (ms) to prevent instant re-dock. */
export const SHIP_UNDOCK_DOCKING_COOLDOWN_MS = 5000;

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

/** Speed threshold (m/s) above which hover thrusters cut out — ship is in orbit, not hovering. */
export const HOVER_CUTOFF_SPEED = 30;

/**
 * Hover thruster nozzle positions in ship-local space.
 * Six nozzles in three pairs (front / mid / rear) on the underside of the craft.
 * Particles emit in local -Y (straight down). Adjust to match the model geometry.
 *
 *  [x, y, z]  — x: +port / -starboard,  y: height (negative = underside),  z: +nose / -tail
 */
export const HOVER_THRUSTER_LOCAL: readonly [number, number, number][] = [
  //  front pair  (near nose)
  [1.8, 0.5, 16.0],
  [-1.8, 0.5, 16.0],
  //  mid pair    (centre of hull)
  [3.2, 0.5, 3.0],
  [-3.2, 0.5, 3.0],
  //  rear pair   (near main engines)
  [6.8, 0.5, -7.0],
  [-6.8, 0.5, -7.0],
] as const;

/** RCS thruster nozzle positions in ship-local space (same values as particle emitters). */
export const RCS_THRUSTER_LOCAL = {
  forward: [0, 0, 18.5] as [number, number, number],
  left: [5.8, 0, 16] as [number, number, number],
  right: [-5.8, 0, 16] as [number, number, number],
  strafeLeft: [3.6, 0, 4.0] as [number, number, number],
  strafeRight: [-3.6, 0, 4.0] as [number, number, number],
  forwardLight: [0, 0, 20.5] as [number, number, number],
  leftLight: [3.4, 2, 18] as [number, number, number],
  rightLight: [-3.4, 2, 18] as [number, number, number],
  strafeLeftLight: [3.6, 2, 4.0] as [number, number, number],
  strafeRightLight: [-3.6, 2, 4.0] as [number, number, number],
} as const;

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
