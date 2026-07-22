// ── Laser spotlight ───────────────────────────────────────────────────────
/** Light colour of the cursor-tracking spotlight. */
export const LASER_SPOTLIGHT_COLOR = '#ffffff';
/** Luminous intensity of the spotlight. */
export const LASER_SPOTLIGHT_INTENSITY = 8;
/** Half-angle of the spotlight cone (radians). */
export const LASER_SPOTLIGHT_ANGLE = 0.58;
/** Soft-edge fraction (0 = hard edge, 1 = fully soft). */
export const LASER_SPOTLIGHT_PENUMBRA = 0.85;
/** Physically-based distance falloff exponent (lower = slower falloff). */
export const LASER_SPOTLIGHT_DECAY = 0.2;
/**
 * Maximum range of the spotlight in world units.
 * 0 = unlimited (Three.js removes the hard cutoff; falloff is governed by decay only).
 */
export const LASER_SPOTLIGHT_DISTANCE = 0;

// ── Particle cannon (hold "G" to fire) ─────────────────────────────────────
/** Maximum bullets alive at once (ring-buffer pool size). */
export const CANNON_MAX_BULLETS = 400;
/** Rounds fired per second while the trigger is held. */
export const CANNON_FIRE_RATE = 10;
/** Muzzle speed in world units/second (relative to the ship). */
export const CANNON_BULLET_SPEED = 1200;
/** How long a bullet lives before despawning (seconds). */
export const CANNON_BULLET_LIFETIME = 2.5;
/** Rendered size of the glowing bullet head (world units, size-attenuated). */
export const CANNON_BULLET_SIZE = 1.2;
/** Length of the tracer streak drawn behind each bullet (world units, ship frame). */
export const CANNON_TRACER_LENGTH = 12;
/** Random angular spread applied to each shot (radians of jitter per axis). */
export const CANNON_SPREAD = 0.005;
/** Bullet / tracer head colour. */
export const CANNON_BULLET_COLOR = '#ffffff';
/** Power drained per second while the cannon is firing. */
export const CANNON_POWER_DRAIN = 1.2;
/**
 * Collision radius for swept hit tests against registered collidables.
 * Bullets themselves are not physics bodies — only the path is tested.
 */
export const CANNON_BULLET_HIT_RADIUS = 1.5;
/** Impulse scale applied to collidables that expose `applyImpulse` on hit. */
export const CANNON_BULLET_HIT_IMPULSE = 0.02;
/**
 * Cannon aim stays horizontal (dir.y = 0) unless the free-look ray hits a
 * physical collidable whose hit point is this far above/below world Y = 0.
 */
export const CANNON_AIM_OFF_PLANE_Y = 2;
/** How far the aim-assist ray searches for an off-plane collidable (world units). */
export const CANNON_AIM_RAY_RANGE = 8000;

// ── Ship gun mounts (multi-gun ready) ─────────────────────────────────────
/**
 * Per-mount firing envelope relative to the ship.
 * Add more entries later for turreted / wing guns with their own arcs.
 */
export type ShipGunMountConfig = {
  id: string;
  /**
   * Half-angle of the yaw firing arc from this mount's forward (degrees).
   * Aim is clamped to ±this about ship forward (left/right).
   */
  yawHalfArcDeg: number;
  /**
   * Optional half-angle of the pitch firing arc (degrees).
   * When omitted, pitch follows existing aim rules (flat / off-plane hits).
   */
  pitchHalfArcDeg?: number;
  /** Local-space muzzle offset from the ship origin. */
  muzzleLocal?: [number, number, number];
  /** Local-space forward for this mount (defaults to ship flight forward, −Z). */
  forwardLocal?: [number, number, number];
};

/**
 * Twin machine-gun layout (ship-local space).
 * Flight nose is −Z; +X is starboard. Edit these to reposition the mounts.
 */
/** Distance between left and right muzzles (along local X). */
export const PLAYER_MG_SPACING = 10;
/** How far ahead of the ship origin the muzzles sit (along flight forward, −Z). */
export const PLAYER_MG_FORWARD = 12;
/** Vertical offset of the muzzles (local Y). */
export const PLAYER_MG_HEIGHT = 0;
/** Shared yaw half-arc for both machine guns (degrees). */
export const PLAYER_MG_YAW_HALF_ARC_DEG = 10;

const _mgHalf = PLAYER_MG_SPACING / 2;

/** Port (left) machine gun. */
export const PLAYER_MG_LEFT: ShipGunMountConfig = {
  id: 'mg-left',
  yawHalfArcDeg: PLAYER_MG_YAW_HALF_ARC_DEG,
  muzzleLocal: [-_mgHalf, PLAYER_MG_HEIGHT, -PLAYER_MG_FORWARD],
  forwardLocal: [0, 0, -1],
};

/** Starboard (right) machine gun. */
export const PLAYER_MG_RIGHT: ShipGunMountConfig = {
  id: 'mg-right',
  yawHalfArcDeg: PLAYER_MG_YAW_HALF_ARC_DEG,
  muzzleLocal: [_mgHalf, PLAYER_MG_HEIGHT, -PLAYER_MG_FORWARD],
  forwardLocal: [0, 0, -1],
};

/** @deprecated Use PLAYER_MG_LEFT / PLAYER_SHIP_GUNS. Kept for older call sites. */
export const DEFAULT_NOSE_CANNON = PLAYER_MG_LEFT;

/** Active gun mounts on the player ship — shots alternate across this list. */
export const PLAYER_SHIP_GUNS: readonly ShipGunMountConfig[] = [PLAYER_MG_LEFT, PLAYER_MG_RIGHT];

// ── Cannon impact sparks ──────────────────────────────────────────────────
/** Max spark particles alive at once (ring pool). */
export const CANNON_HIT_MAX_PARTICLES = 512;
/** Sparks spawned per bullet impact. */
export const CANNON_HIT_PARTICLES_PER_BURST = 10;
/** Spark lifetime (seconds). */
export const CANNON_HIT_LIFETIME = 0.32;
/** Outward speed range along the hit normal / cone (world units/s). */
export const CANNON_HIT_SPEED_MIN = 50;
export const CANNON_HIT_SPEED_MAX = 220;
/** Cone half-angle around the surface normal (radians). */
export const CANNON_HIT_SPREAD = 0.85;
/** Rendered spark point size (world units, size-attenuated). */
export const CANNON_HIT_SIZE = 2.4;
/** Spark colour (additive). */
export const CANNON_HIT_COLOR = '#ffffff';
/** Velocity damping per second while sparks fly. */
export const CANNON_HIT_DRAG = 4.5;
/** Window event name dispatched when a cannon bullet hits a collidable. */
export const EVENT_CANNON_BULLET_HIT = 'CannonBulletHit';
/** Hull points on a target-practice scow drone. */
export const CANNON_TARGET_HULL_MAX = 100;
/** Hull removed from a target drone per cannon round that hits. */
export const CANNON_TARGET_HIT_DAMAGE = 8;

// ── Scow breakup debris ───────────────────────────────────────────────────
/** Authored wreck pieces spawned when a scavenger scow is destroyed. */
export const SCOW_DEBRIS_URLS = [
  '/space_garbage_truck_debris/debris-1.glb',
  '/space_garbage_truck_debris/debris-2.glb',
  '/space_garbage_truck_debris/debris-3.glb',
] as const;
/** Visual scale for debris (matches the intact scow primitive scale). */
export const SCOW_DEBRIS_SCALE = 10;
/** Extra outward kick applied to each piece on breakup (world units/s). */
export const SCOW_DEBRIS_IMPULSE_MIN = 0.2;
export const SCOW_DEBRIS_IMPULSE_MAX = 1;
/** Random tumble rate per axis on breakup (rad/s). */
export const SCOW_DEBRIS_TUMBLE = 0.2;
/** Seconds before debris pieces are removed from the scene. */
export const SCOW_DEBRIS_LIFETIME = 204;

/** Dispatched when a destructible vessel breaks into debris. */
export const EVENT_VESSEL_BREAKUP = 'VesselBreakup';

// ── Breakup VFX (venting gas + electrical shorts) ─────────────────────────
/** Soft white gas puffs escaping the wreck. */
export const BREAKUP_GAS_MAX_PARTICLES = 256;
export const BREAKUP_GAS_PER_BURST = 48;
export const BREAKUP_GAS_LIFETIME_MIN = 2.8;
export const BREAKUP_GAS_LIFETIME_MAX = 5.5;
export const BREAKUP_GAS_SPEED_MIN = 10;
export const BREAKUP_GAS_SPEED_MAX = 36;
/** Initial spawn radius around the wreck center (world units). */
export const BREAKUP_GAS_SPREAD_RADIUS = 22;
export const BREAKUP_GAS_SIZE = 8;
/** Peak brightness multiplier for venting gas (additive). */
export const BREAKUP_GAS_OPACITY = 0.35;
export const BREAKUP_GAS_COLOR = '#ffffff';
export const BREAKUP_GAS_DRAG = 0.85;

/** Sharp electric-blue shorting flashes. */
export const BREAKUP_ARC_MAX_PARTICLES = 128;
export const BREAKUP_ARC_BURST_COUNT = 18;
/** Extra random arcs spawned over this window after breakup (seconds). */
export const BREAKUP_ARC_AFTERGLOW = 1.2;
export const BREAKUP_ARC_AFTERGLOW_RATE = 10;
export const BREAKUP_ARC_LIFETIME_MIN = 1.4;
export const BREAKUP_ARC_LIFETIME_MAX = 2.8;
export const BREAKUP_ARC_SPEED_MIN = 14;
export const BREAKUP_ARC_SPEED_MAX = 80;
export const BREAKUP_ARC_SIZE = 7;
export const BREAKUP_ARC_COLOR = '#4db8ff';
export const BREAKUP_ARC_CORE_COLOR = '#e8f7ff';
export const BREAKUP_ARC_SPREAD_RADIUS = 28;
/** How often an arc particle tends to pop bright while drifting (Hz-ish). */
export const BREAKUP_ARC_FLICKER_RATE = 9;

/** Dark angular hull-plating shards. */
export const BREAKUP_PLATE_MAX = 64;
export const BREAKUP_PLATE_PER_BURST = 28;
export const BREAKUP_PLATE_LIFETIME_MIN = 3.5;
export const BREAKUP_PLATE_LIFETIME_MAX = 7;
export const BREAKUP_PLATE_SPEED_MIN = 6;
export const BREAKUP_PLATE_SPEED_MAX = 28;
export const BREAKUP_PLATE_SPREAD_RADIUS = 16;
/** Thin-plate scale ranges (world units) — width / thickness / length. */
export const BREAKUP_PLATE_SCALE_W_MIN = 1.05;
export const BREAKUP_PLATE_SCALE_W_MAX = 4.8;
export const BREAKUP_PLATE_SCALE_T = 0.18;
export const BREAKUP_PLATE_SCALE_L_MIN = 1.5;
export const BREAKUP_PLATE_SCALE_L_MAX = 7.2;
export const BREAKUP_PLATE_TUMBLE_MIN = 1.2;
export const BREAKUP_PLATE_TUMBLE_MAX = 5.5;
export const BREAKUP_PLATE_DRAG = 0.55;
export const BREAKUP_PLATE_COLOR = '#0a0a0c';
export const BREAKUP_PLATE_ROUGHNESS = 0.92;
export const BREAKUP_PLATE_METALNESS = 0.35;

// ── Hostile NPC fighter (player-class shuttle) ────────────────────────────
/** Preferred standoff distance while engaging (world units). */
export const NPC_FIGHTER_STANDOFF = 120;
/** Soft band around standoff where the fighter holds and shoots. */
export const NPC_FIGHTER_STANDOFF_BAND = 40;
/** Max relative closing / separation speed while pursuing (world units/s). */
export const NPC_FIGHTER_CLOSING_SPEED = 35;
/** PD yaw gains (match AIShip feel). */
export const NPC_FIGHTER_YAW_P = 3.0;
export const NPC_FIGHTER_YAW_D = 4.5;
/** Open fire when the player is within this distance (world units). */
export const NPC_FIGHTER_GUN_RANGE = 400;
/** Half-angle (deg) from nose (−Z) within which the fighter will shoot. */
export const NPC_FIGHTER_FIRE_CONE_DEG = 12;
/** MG burst length (seconds), rolled uniformly per burst. */
export const NPC_FIGHTER_BURST_DURATION_MIN = 0.5;
export const NPC_FIGHTER_BURST_DURATION_MAX = 2;
/** Pause between bursts (seconds), rolled uniformly after each burst. */
export const NPC_FIGHTER_BURST_GAP_MIN = 0.45;
export const NPC_FIGHTER_BURST_GAP_MAX = 1.4;
/** Bullet pool size for a single NPC fighter. */
export const NPC_CANNON_MAX_BULLETS = 200;
/**
 * How far ahead (plus own speed × time) the fighter looks for collision meshes
 * to steer around with player-style thrusters.
 */
export const NPC_FIGHTER_AVOID_LOOKAHEAD = 90;
/** Extra clearance beyond ship + obstacle radii when avoiding (world units). */
export const NPC_FIGHTER_AVOID_CLEARANCE = 22;
/** Blend weight of avoidance vs pursuit when an obstacle is in the path. */
export const NPC_FIGHTER_AVOID_WEIGHT = 2.2;
/** Seconds of travel used to extend look-ahead with current speed. */
export const NPC_FIGHTER_AVOID_LOOKAHEAD_TIME = 1.4;
/** Min / max thrust multiplier the fighter may select (same idea as player thrust dial). */
export const NPC_FIGHTER_THRUST_MULT_MIN = 0.5;
export const NPC_FIGHTER_THRUST_MULT_MAX = 10;
/**
 * Maneuver thrusters (strafe / reverse / yaw) are capped like the player
 * (`Math.min(thrustMultiplier, 2)` in ship physics).
 */
export const NPC_FIGHTER_MANEUVER_THRUST_CAP = 2;
/** Baseline linear drag (1/s) — enemy has artificial resistance unlike debris. */
export const NPC_FIGHTER_LINEAR_DAMP = 0.85;
/** Stronger linear drag when velocity is near the desired trajectory. */
export const NPC_FIGHTER_LINEAR_DAMP_ON_TRAJECTORY = 3.2;
/** Velocity-error threshold (units/s) to treat as “on trajectory”. */
export const NPC_FIGHTER_TRAJECTORY_VEL_EPS = 8;
/** Baseline angular drag (1/s) on yaw rate. */
export const NPC_FIGHTER_ANGULAR_DAMP = 4.5;
/** Rapid angular cancel when nose is on target (stops overshoot spin). */
export const NPC_FIGHTER_ANGULAR_DAMP_ALIGNED = 16;
/** |yaw error| (rad) below which alignment damping / counter-yaw engage. */
export const NPC_FIGHTER_ALIGN_YAW_RAD = 0.12;

// ── Railgun beam geometry ─────────────────────────────────────────────────
/** Outer radius of the railgun beam cylinder (world units). */
export const RAILGUN_BEAM_OUTER_RADIUS = 0.03;
/** Inner radius of the railgun beam core cylinder (world units). */
export const RAILGUN_BEAM_INNER_RADIUS = 0.012;

// ── Railgun beam colours ──────────────────────────────────────────────────
/** Outer beam colour (hot plasma trail). */
export const RAILGUN_BEAM_COLOR = '#ff2a00';
/** Inner core colour (superheated core). */
export const RAILGUN_BEAM_CORE_COLOR = '#fff6cc';

// ── Railgun beam fade ─────────────────────────────────────────────────────
/** Peak opacity of the outer beam at the start of the shot. */
export const RAILGUN_BEAM_MAX_OPACITY = 0.45;
/** Peak opacity of the inner core at the start of the shot. */
export const RAILGUN_CORE_MAX_OPACITY = 0.7;

// ── Railgun charge-up glow ────────────────────────────────────────────────
/** Radius of the outer charge glow sphere (world units). */
export const RAILGUN_CHARGE_GLOW_RADIUS = 200;
/** Radius of the inner charge core sphere (world units). */
export const RAILGUN_CHARGE_CORE_RADIUS = 75;
/** HDR luminance multiplier for the charge glow — values >1 feed the Bloom pass. */
export const RAILGUN_CHARGE_INTENSITY = 20;
/** Peak opacity of the outer charge glow at full charge. */
export const RAILGUN_CHARGE_GLOW_MAX_OPACITY = 1.0;
/** Peak opacity of the inner charge core at full charge. */
export const RAILGUN_CHARGE_CORE_MAX_OPACITY = 1.0;

// ── Capital-ship railgun beam (scrapper cinematic) ─────────────────────────
/** Outer radius of the capital-ship railgun beam cylinder (world units). */
export const CAPITAL_RAILGUN_BEAM_OUTER_RADIUS = 150;
/** Inner radius of the capital-ship railgun core cylinder (world units). */
export const CAPITAL_RAILGUN_BEAM_INNER_RADIUS = 60;
/** Outer beam colour — electric blue. */
export const CAPITAL_RAILGUN_BEAM_COLOR = '#2255ff';
/** Inner core colour — pure white. */
export const CAPITAL_RAILGUN_CORE_COLOR = '#ffffff';
/** Peak opacity of the outer beam. */
export const CAPITAL_RAILGUN_BEAM_MAX_OPACITY = 0.9;
/** Peak opacity of the inner core. */
export const CAPITAL_RAILGUN_CORE_MAX_OPACITY = 1.0;
/** Duration of the visible beam flash (seconds). */
export const CAPITAL_RAILGUN_SHOT_DURATION = 0.6;
/** Duration of the charge-up glow before firing (seconds). */
export const CAPITAL_RAILGUN_CHARGE_DURATION = 2.0;
/** Radius of the outer charge glow sphere on Neptune's surface (world units). */
export const CAPITAL_RAILGUN_CHARGE_GLOW_RADIUS = 2000;
/** Radius of the inner charge core sphere (world units). */
export const CAPITAL_RAILGUN_CHARGE_CORE_RADIUS = 800;
/** HDR luminance multiplier for the charge glow. */
export const CAPITAL_RAILGUN_CHARGE_INTENSITY = 50;
/** Distance the beam extends past the target (world units). */
export const CAPITAL_RAILGUN_OVERSHOOT = 20000;
