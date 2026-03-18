import * as THREE from 'three';
import type { AutopilotCtx } from './types';

const _toPlanet = new THREE.Vector3();

/**
 * Sphere-of-influence entry speed limiter.
 *
 * Returns true if we are inside the gravity body's SOI and closing faster
 * than 150 m/s — in which case it sets thrustForward (brake) and the caller
 * should skip the normal approach burn for this frame.
 */
export function SOIEntry(ctx: AutopilotCtx): boolean {
  const { gravBody, shipPos, velFlat, thrustForward } = ctx;
  if (!gravBody?.soiRadius) return false;

  const bp = gravBody.position;
  const r = Math.sqrt(
    Math.pow(shipPos.x - bp.x, 2) + Math.pow(shipPos.z - bp.z, 2)
  );
  if (r >= gravBody.soiRadius) return false;

  _toPlanet.set(bp.x - shipPos.x, 0, bp.z - shipPos.z).normalize();
  if (velFlat.dot(_toPlanet) > 150) {
    thrustForward.current = true; // W key: fires away from nose = brake
    return true;
  }
  return false;
}
