import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
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
    const dx = pos.x - body.position.x;
    const dz = pos.z - body.position.z;
    const distSq = dx * dx + dz * dz;
    const srSq = body.surfaceRadius * body.surfaceRadius;
    const soiSq = body.soiRadius * body.soiRadius;
    if (distSq > srSq && distSq < soiSq) {
      const accel = body.mu / distSq;
      if (accel > primaryAccel) {
        primaryAccel = accel;
        result = { body, id, distSq };
      }
    }
  }

  return result;
}
