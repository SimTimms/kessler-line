import type { GravityBody } from '../../context/GravityRegistry';

/**
 * The last trajectory result from the worker.
 *
 * The request only runs every few frames and the reply arrives asynchronously,
 * so per-frame code reads from here instead of from the result directly.
 *
 * Module-level: shared by every mounted VelocityIndicator.
 */
export const trajectoryCache = {
  /** The body the ship is orbiting, or null. */
  primaryBody: null as GravityBody | null,
  /** False when the primary body is the Sun. */
  primaryIsPlanet: false,
  /** Index into the trajectory points closest to periapsis, or -1. */
  periStep: -1,
  /** Index into the trajectory points closest to apoapsis, or -1. */
  apoStep: -1,
  /** Index where the orbit closes, or -1 for an open (e.g. hyperbolic) path. */
  orbitClosedAt: -1,
};
