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
