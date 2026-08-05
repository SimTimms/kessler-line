import { THRUST, YAW_THRUST } from './shipConfig';

/** Base linear acceleration (units/s²) for a main thruster at multiplier 1. */
export const THRUSTER_MAIN_FORCE = THRUST;

/** Base linear acceleration (units/s²) for an RCS thruster at multiplier 1. */
export const THRUSTER_RCS_FORCE = THRUST;

/** Base yaw acceleration (rad/s²) for a yaw thruster at multiplier 1. */
export const THRUSTER_YAW_FORCE = YAW_THRUST;

/** RCS thrusters use the same cheap fuel factor as the player ship resource drain. */
export const THRUSTER_RCS_FUEL_FACTOR = 0.01;

/** Main-engine particle emit rate (particles/s). */
export const THRUSTER_MAIN_EMIT_RATE = 300;

/** RCS particle emit rate (particles/s). */
export const THRUSTER_RCS_EMIT_RATE = 200;

/** Exhaust particle lifetime (seconds). */
export const THRUSTER_PARTICLE_LIFETIME = 0.04;

/** Exhaust particle speed (local units/s). */
export const THRUSTER_PARTICLE_SPEED = 100;
/**
 * Fraction of ship velocity inherited by newly emitted particles.
 * Helps prevent trails from instantly falling behind at high ship speed.
 */
export const THRUSTER_PARTICLE_SHIP_VELOCITY_INHERIT = 0;
/**
 * Upper speed cap used when inheriting carrier velocity for particles.
 * Keeps inheritance stable even at extreme travel speeds.
 */
export const THRUSTER_PARTICLE_SHIP_VELOCITY_MAX = 1200;
/**
 * One-time spawn kick added along current ship-velocity heading.
 * Gives a short burst so fresh particles clear the hull while rotating fast.
 */
export const THRUSTER_PARTICLE_INITIAL_IMPULSE = 220;

/** Max pooled particles per thruster emitter. */
export const THRUSTER_PARTICLE_POOL = 200;

/** Point-light intensity while firing. */
export const THRUSTER_LIGHT_INTENSITY_MAIN = 200;
export const THRUSTER_LIGHT_INTENSITY_RCS = 405;

export const THRUSTER_LIGHT_COLOR = '#8888ff';
export const THRUSTER_LIGHT_DISTANCE = 20;
export const THRUSTER_LIGHT_DECAY = 0.5;

/** How aggressively particle trails collapse back toward their thrust axis. */
export const THRUSTER_PARTICLE_TAPER_STRENGTH = 12;
/** Pool capacities used by ship-local particle systems. */
export const THRUSTER_MAIN_PARTICLE_POOL = 1200;
export const THRUSTER_RCS_PARTICLE_POOL = 200;
export const THRUSTER_HOVER_PARTICLE_POOL = 500;
/** Hover thruster particle tuning (currently spawn-disabled in gameplay). */
export const THRUSTER_HOVER_EMIT_RATE = 500;
export const THRUSTER_HOVER_PARTICLE_LIFETIME = 0.06;
export const THRUSTER_HOVER_PARTICLE_SPEED = 70;
/** Visual scaling controls for thrust dial influence. */
export const THRUSTER_VISUAL_MAX_MULTIPLIER = 3;
export const THRUSTER_RCS_VISUAL_MULTIPLIER = 1;
/** Base rendered point sizes for ship thruster particles. */
export const THRUSTER_MAIN_PARTICLE_SIZE = 4.4;
export const THRUSTER_RCS_PARTICLE_SIZE = 2.2;
export const THRUSTER_HOVER_PARTICLE_SIZE = 0.15;
