import type * as THREE from 'three';

// ── Torpedo physics ─────────────────────────────────────────────────────────
/** Maximum forward speed once the engine is lit (world units/s). */
export const TORPEDO_MAX_SPEED = 150;
/** Forward thrust acceleration during CRUISE phase (world units/s²). */
export const TORPEDO_THRUST_ACCELERATION = 30;
/** Initial forward speed during horizontal EJECT phase (world units/s). */
export const TORPEDO_HORIZONTAL_EJECT_SPEED = 40;
/** Upward speed during vertical LOFT phase (world units/s). */
export const TORPEDO_VERTICAL_RISE_SPEED = 60;
/** Altitude gain (world units) above launch origin before transitioning to LEVEL_OUT. */
export const TORPEDO_VERTICAL_RISE_HEIGHT = 4;
/** Seconds the horizontal torpedo coasts before igniting its engine. */
export const TORPEDO_HORIZONTAL_IGNITION_DELAY = 3;
/** Seconds allowed for the vertical torpedo to slerp from "up" to "toward target". */
export const TORPEDO_VERTICAL_LEVEL_OUT_TIME = 3;

// ── Torpedo tracking ────────────────────────────────────────────────────────
/** Seconds between heading corrections toward the target. */
export const TORPEDO_TRACKING_INTERVAL = 2;
/** Slerp factor per frame during the correction window (higher = snappier turn). */
export const TORPEDO_TRACKING_TURN_RATE = 4;
/** Duration (seconds) of the smooth rotation within each tracking cycle. */
export const TORPEDO_TRACKING_CORRECTION_DURATION = 0.5;

// ── Torpedo collision & damage ──────────────────────────────────────────────
/** Collision capsule radius for swept segment tests (world units). */
export const TORPEDO_COLLISION_RADIUS = 1.5;
/** Collision capsule cylindrical height (world units). */
export const TORPEDO_COLLISION_HEIGHT = 4;
/** Hull damage dealt on impact. */
export const TORPEDO_HIT_DAMAGE = 40;
/** Self-destruct after this many seconds (prevents infinite flight). */
export const TORPEDO_MAX_LIFETIME = 30;

// ── Torpedo visual ──────────────────────────────────────────────────────────
/** Capsule mesh radius (world units). */
export const TORPEDO_VISUAL_RADIUS = 0.6;
/** Capsule mesh length — cylindrical section (world units). */
export const TORPEDO_VISUAL_LENGTH = 3;
/** Body colour. */
export const TORPEDO_BODY_COLOR = '#888888';
/** Engine glow colour (additive sphere behind the body). */
export const TORPEDO_ENGINE_GLOW_COLOR = '#ff6600';
/** Emissive intensity of the engine glow. */
export const TORPEDO_ENGINE_GLOW_INTENSITY = 8;
/** Radius of the engine glow sphere (world units). */
export const TORPEDO_ENGINE_GLOW_RADIUS = 0.8;

// ── Torpedo explosion VFX ───────────────────────────────────────────────────
/** Max explosion particles alive at once (ring pool). */
export const TORPEDO_EXPLOSION_MAX_PARTICLES = 256;
/** Particles spawned per detonation. */
export const TORPEDO_EXPLOSION_PARTICLES_PER_BURST = 32;
/** Explosion particle lifetime (seconds). */
export const TORPEDO_EXPLOSION_LIFETIME = 0.8;
/** Outward speed range (world units/s). */
export const TORPEDO_EXPLOSION_SPEED_MIN = 30;
export const TORPEDO_EXPLOSION_SPEED_MAX = 160;
/** Cone half-angle around the hit normal (radians). Full sphere ≈ PI. */
export const TORPEDO_EXPLOSION_SPREAD = Math.PI;
/** Rendered particle point size (world units, size-attenuated). */
export const TORPEDO_EXPLOSION_SIZE = 5;
/** Particle colour (additive). */
export const TORPEDO_EXPLOSION_COLOR = '#ff8800';
/** Velocity damping per second. */
export const TORPEDO_EXPLOSION_DRAG = 2.5;

// ── Scanner labels ──────────────────────────────────────────────────────────
/** Label shown on the drive-signature scanner. */
export const TORPEDO_DRIVE_SIGNATURE_LABEL = 'Torpedo Drive';
/** Label shown on the proximity scanner. */
export const TORPEDO_PROXIMITY_LABEL = 'Torpedo';

// ── Events ──────────────────────────────────────────────────────────────────
/** CustomEvent name dispatched to spawn a torpedo. */
export const EVENT_TORPEDO_LAUNCH = 'TorpedoLaunch';
/** CustomEvent name dispatched when a torpedo detonates on impact. */
export const EVENT_TORPEDO_HIT = 'TorpedoHit';

// ── Types ───────────────────────────────────────────────────────────────────
export type TorpedoLaunchMode = 'vertical' | 'horizontal';

export interface TorpedoLaunchDetail {
  id: string;
  mode: TorpedoLaunchMode;
  origin: THREE.Vector3Like;
  launcherVelocity: THREE.Vector3Like;
  launcherForward: THREE.Vector3Like;
  /** Collision ID of the launcher — excluded from self-hit tests. */
  launcherId: string;
  /** Write the current target world position into `target` and return it. */
  getTargetPosition: (target: THREE.Vector3) => THREE.Vector3;
}
