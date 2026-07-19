/** Player-owned utility drone defaults (mining scene first). */

export type DroneType = 'mining';

export const MINING_DRONE_ID = 'mining-drone-1';
export const MINING_DRONE_LABEL = 'Mining Drone';

/**
 * Same asset StationDrones / SupportDroneFleet use.
 * Note: `/supportDrone.glb` is preloaded by SupportDroneFleet but not rendered
 * there — that Sketchfab mesh has been unreliable in-scene; prefer this glTF.
 */
export const MINING_DRONE_MODEL_URL = '/drone/untitled.gltf';

export const MINING_DRONE_SCALE = 1;

/** Collision sphere radius in world units. */
export const MINING_DRONE_COLLISION_RADIUS = 1.4;

/** Forward thrust acceleration (units/s²). Smaller than the player ship. */
export const DRONE_THRUST = 3.2;

/** Max cruise speed (units/s). */
export const DRONE_MAX_SPEED = 22;

/** Distance at which approach switches to braking. */
export const DRONE_BRAKE_DIST = 48;

/** Soft-arrive distance for clamp / bay attach. */
export const DRONE_ARRIVE_DIST = 6;

/** Max speed considered "stopped" for docking. */
export const DRONE_ARRIVE_SPEED = 2.5;

/** Max relative impact speed that still allows a clean clamp. */
export const DRONE_CLAMP_MAX_RELATIVE_SPEED = 10;

/** Relative impact speed above which hull takes damage. */
export const DRONE_CRASH_SPEED = 14;

/** Hull damage per (impactSpeed - crash threshold) unit. */
export const DRONE_CRASH_DAMAGE_PER_SPEED = 8;

/** Fuel consumed per second while thrusters are firing. */
export const DRONE_FUEL_BURN_PER_SEC = 1.8;

/** Yaw PD gains for approach steering. */
export const DRONE_YAW_P = 3.6;
export const DRONE_YAW_D = 5.2;

/** Offset from ship position when stowed / recalled home. */
export const DRONE_BAY_OFFSET: [number, number, number] = [3.2, 0.4, -1.5];

/** Seconds per ore unit extracted by a mining drone. */
export const DRONE_MINING_CYCLE_SECONDS = 20;

/** Max cargo stacks a mining drone can hold. */
export const DRONE_CARGO_CAPACITY = 8;
