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
export const THRUSTER_MAIN_EMIT_RATE = 900;

/** RCS particle emit rate (particles/s). */
export const THRUSTER_RCS_EMIT_RATE = 900;

/** Exhaust particle lifetime (seconds). */
export const THRUSTER_PARTICLE_LIFETIME = 0.04;

/** Exhaust particle speed (local units/s). */
export const THRUSTER_PARTICLE_SPEED = 100;

/** Max pooled particles per thruster emitter. */
export const THRUSTER_PARTICLE_POOL = 200;

/** Point-light intensity while firing. */
export const THRUSTER_LIGHT_INTENSITY_MAIN = 200;
export const THRUSTER_LIGHT_INTENSITY_RCS = 65;

export const THRUSTER_LIGHT_COLOR = '#88ccff';
export const THRUSTER_LIGHT_DISTANCE = 40;
export const THRUSTER_LIGHT_DECAY = 2;
