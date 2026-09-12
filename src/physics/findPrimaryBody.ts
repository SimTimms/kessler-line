import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { distanceSquaredXZ, isInsideSOI, gravityAccel } from '../maths/gravity';
import type { PrimaryBodyResult } from './types';

/**
 * Find the gravity body exerting the greatest acceleration on a position.
 *
 * Uses `distanceToSquared` to skip a `Math.sqrt` per body per frame.
 * Since accel = mu / r², we use distSq directly without ever taking a root.
 */
export function findPrimaryBody(pos: THREE.Vector3): PrimaryBodyResult | null {
  let primaryAccel = 0;
  let result: PrimaryBodyResult | null = null;

  for (const [id, body] of gravityBodies) {
    // XZ-plane distance — game is 2D; ignore y so off-plane body positions
    // don't weaken gravity or leak energy via the y-clamp.
    const distSq = distanceSquaredXZ(pos.x, pos.z, body.position.x, body.position.z);
    if (isInsideSOI(distSq, body.surfaceRadius, body.soiRadius)) {
      const accel = gravityAccel(body.mu, distSq);
      if (accel > primaryAccel) {
        primaryAccel = accel;
        result = { body, id, distSq };
      }
    }
  }

  return result;
}
