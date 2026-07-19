import { gravityBodies } from '../context/GravityRegistry';

const DEFAULT_STEPS = 160;
const DEFAULT_DT = 0.9;
const ORBIT_MIN_STEPS = 25;
const ORBIT_CLOSE_DIST = 150;
const ORBIT_AWAY_DIST = 500;

export type TrajectoryPointXZ = { x: number; z: number };

/**
 * Predict ship path in the XZ plane under primary-body gravity (symplectic Euler).
 * Used by the minimap velocity curve so orbital curvature is visible.
 */
export function sampleShipTrajectoryXZ(
  shipX: number,
  shipZ: number,
  velX: number,
  velZ: number,
  steps = DEFAULT_STEPS,
  baseDt = DEFAULT_DT
): TrajectoryPointXZ[] {
  let primaryBody: (typeof gravityBodies extends Map<string, infer T> ? T : never) | null = null;
  let primaryAccel = 0;
  for (const [, body] of gravityBodies) {
    const dx = body.position.x - shipX;
    const dz = body.position.z - shipZ;
    const dist2 = dx * dx + dz * dz;
    const dist = Math.sqrt(dist2);
    if (dist > body.surfaceRadius && dist < body.soiRadius) {
      const accel = body.mu / dist2;
      if (accel > primaryAccel) {
        primaryAccel = accel;
        primaryBody = body;
      }
    }
  }

  let simX: number;
  let simZ: number;
  let simVx: number;
  let simVz: number;
  if (primaryBody) {
    simX = shipX - primaryBody.position.x;
    simZ = shipZ - primaryBody.position.z;
    simVx = velX - primaryBody.velocity.x;
    simVz = velZ - primaryBody.velocity.z;
  } else {
    simX = shipX;
    simZ = shipZ;
    simVx = velX;
    simVz = velZ;
  }

  let simDt = baseDt;
  let orbitCloseDist = ORBIT_CLOSE_DIST;
  if (primaryBody) {
    const r0 = Math.hypot(simX, simZ);
    const v2 = simVx * simVx + simVz * simVz;
    const energy = 0.5 * v2 - primaryBody.mu / Math.max(r0, 1);
    if (energy < 0) {
      const a = -primaryBody.mu / (2 * energy);
      const period = 2 * Math.PI * Math.sqrt((a * a * a) / primaryBody.mu);
      const neededDt = period / (steps * 0.9);
      if (neededDt > simDt) {
        simDt = neededDt;
        orbitCloseDist = Math.max(ORBIT_CLOSE_DIST, Math.hypot(simVx, simVz) * simDt * 2);
      }
    }
  }

  const out: TrajectoryPointXZ[] = new Array(steps);
  const startX = simX;
  const startZ = simZ;
  let maxDistFromStart = 0;
  let pointCount = steps;

  for (let i = 0; i < steps; i++) {
    const worldX = primaryBody ? simX + primaryBody.position.x : simX;
    const worldZ = primaryBody ? simZ + primaryBody.position.z : simZ;
    out[i] = { x: worldX, z: worldZ };

    let ax = 0;
    let az = 0;
    let hitSurface = false;

    if (primaryBody) {
      const dx = -simX;
      const dz = -simZ;
      const dist2 = dx * dx + dz * dz;
      const dist = Math.sqrt(dist2);
      if (dist < primaryBody.surfaceRadius) {
        hitSurface = true;
      } else {
        const accel = primaryBody.mu / dist2;
        ax += (dx / dist) * accel;
        az += (dz / dist) * accel;
      }
    } else {
      for (const [, body] of gravityBodies) {
        const dx = body.position.x - simX;
        const dz = body.position.z - simZ;
        const dist2 = dx * dx + dz * dz;
        const dist = Math.sqrt(dist2);
        if (dist < body.surfaceRadius) {
          hitSurface = true;
          break;
        }
        if (dist < body.soiRadius) {
          const accel = body.mu / dist2;
          ax += (dx / dist) * accel;
          az += (dz / dist) * accel;
        }
      }
    }

    if (hitSurface) {
      pointCount = i + 1;
      break;
    }

    simVx += ax * simDt;
    simVz += az * simDt;
    simX += simVx * simDt;
    simZ += simVz * simDt;

    const distFromStart = Math.hypot(simX - startX, simZ - startZ);
    if (distFromStart > maxDistFromStart) maxDistFromStart = distFromStart;

    if (
      i >= ORBIT_MIN_STEPS &&
      maxDistFromStart > ORBIT_AWAY_DIST &&
      distFromStart < orbitCloseDist
    ) {
      out[i] = { x: shipX, z: shipZ };
      pointCount = i + 1;
      break;
    }
  }

  return out.slice(0, pointCount);
}
