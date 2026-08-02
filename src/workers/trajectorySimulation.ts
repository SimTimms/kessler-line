import type {
  GravityBodySnapshot,
  TrajectorySimConfig,
  TrajectorySimResult,
} from './trajectoryTypes';
import {
  ORBIT_MIN_STEPS,
  ORBIT_CLOSE_DIST,
  ORBIT_AWAY_DIST,
} from '../config/trajectoryConfig';
import { keplerianTrajectory } from './keplerianOrbit';

/**
 * Pure-math trajectory simulation — no Three.js imports.
 *
 * Symplectic Euler integration in the XZ plane under gravity.
 * When a dominant primary body is detected, the simulation runs in that
 * body's reference frame for numerical stability. Otherwise it falls back
 * to multi-body gravity in world-space.
 *
 * Returns XZ positions interleaved in a Float32Array plus metadata.
 */
export function simulateTrajectory(
  startX: number,
  startZ: number,
  velX: number,
  velZ: number,
  bodies: GravityBodySnapshot[],
  config: TrajectorySimConfig,
): TrajectorySimResult {
  const { steps, detectOrbitClosure, trackApsides, adaptiveDt } = config;

  // ── Primary body detection (strongest gravitational acceleration) ────────
  let primary: GravityBodySnapshot | null = null;
  let primaryAccel = 0;
  for (let b = 0; b < bodies.length; b++) {
    const body = bodies[b];
    const dx = body.posX - startX;
    const dz = body.posZ - startZ;
    const dist2 = dx * dx + dz * dz;
    const srSq = body.surfaceRadius * body.surfaceRadius;
    const soiSq = body.soiRadius * body.soiRadius;
    if (dist2 > srSq && dist2 < soiSq) {
      const accel = body.mu / dist2;
      if (accel > primaryAccel) {
        primaryAccel = accel;
        primary = body;
      }
    }
  }

  // ── Initial conditions (body-relative if primary exists) ─────────────────
  let simX: number, simZ: number, simVx: number, simVz: number;
  if (primary) {
    simX = startX - primary.posX;
    simZ = startZ - primary.posZ;
    simVx = velX - primary.velX;
    simVz = velZ - primary.velZ;
  } else {
    simX = startX;
    simZ = startZ;
    simVx = velX;
    simVz = velZ;
  }

  // ── Analytical Keplerian path (single-body) ─────────────────────────────
  if (primary) {
    return keplerianTrajectory(simX, simZ, simVx, simVz, primary, config);
  }

  // ── Adaptive timestep for bound orbits ───────────────────────────────────
  let simDt = config.dt;
  let orbitCloseDist = ORBIT_CLOSE_DIST;
  if (adaptiveDt && primary) {
    const r0 = Math.sqrt(simX * simX + simZ * simZ);
    const v2 = simVx * simVx + simVz * simVz;
    const energy = 0.5 * v2 - primary.mu / Math.max(r0, 1);
    if (energy < 0) {
      const a = -primary.mu / (2 * energy);
      const period = 2 * Math.PI * Math.sqrt((a * a * a) / primary.mu);
      const neededDt = period / (steps * 0.9);
      if (neededDt > simDt) {
        simDt = neededDt;
        orbitCloseDist = Math.max(
          ORBIT_CLOSE_DIST,
          Math.sqrt(simVx * simVx + simVz * simVz) * simDt * 2.0,
        );
      }
    }
  }

  // ── Output buffer: interleaved XZ ────────────────────────────────────────
  const positions = new Float32Array(steps * 2);

  let orbitClosedAt = -1;
  let maxDistFromStart = 0;
  const originX = simX;
  const originZ = simZ;
  let periStep = -1, apoStep = -1;
  let periDist = Infinity, apoDist = -Infinity;
  let activeSteps = steps;

  // ── Integration loop ────────────────────────────────────────────────────
  for (let i = 0; i < steps; i++) {
    const worldX = primary ? simX + primary.posX : simX;
    const worldZ = primary ? simZ + primary.posZ : simZ;
    positions[i * 2] = worldX;
    positions[i * 2 + 1] = worldZ;

    // Apsis tracking (radial distance from primary center)
    if (trackApsides && primary) {
      const pd = Math.sqrt(simX * simX + simZ * simZ);
      if (pd < periDist) { periDist = pd; periStep = i; }
      if (pd > apoDist) { apoDist = pd; apoStep = i; }
    }

    // ── Gravity acceleration ──────────────────────────────────────────────
    let ax = 0, az = 0;
    let hitSurface = false;

    if (primary) {
      // Single-body (body-relative frame: primary is at origin)
      const dx = -simX;
      const dz = -simZ;
      const dist2 = dx * dx + dz * dz;
      const dist = Math.sqrt(dist2);
      if (dist < primary.surfaceRadius) {
        hitSurface = true;
      } else {
        const accel = primary.mu / dist2;
        ax += (dx / dist) * accel;
        az += (dz / dist) * accel;
      }
    } else {
      // Multi-body (world-space)
      for (let b = 0; b < bodies.length; b++) {
        const body = bodies[b];
        const dx = body.posX - simX;
        const dz = body.posZ - simZ;
        const dist2 = dx * dx + dz * dz;
        const dist = Math.sqrt(dist2);
        if (dist < body.surfaceRadius) { hitSurface = true; break; }
        if (dist < body.soiRadius) {
          const accel = body.mu / dist2;
          ax += (dx / dist) * accel;
          az += (dz / dist) * accel;
        }
      }
    }

    if (hitSurface) {
      // Fill remaining positions with the impact point
      const hitX = positions[i * 2];
      const hitZ = positions[i * 2 + 1];
      for (let j = i + 1; j < steps; j++) {
        positions[j * 2] = hitX;
        positions[j * 2 + 1] = hitZ;
      }
      activeSteps = i + 1;
      break;
    }

    // Symplectic Euler: update velocity then position
    simVx += ax * simDt;
    simVz += az * simDt;
    simX += simVx * simDt;
    simZ += simVz * simDt;

    // ── Orbit closure detection ───────────────────────────────────────────
    if (detectOrbitClosure) {
      const cdx = simX - originX;
      const cdz = simZ - originZ;
      const distFromStart = Math.sqrt(cdx * cdx + cdz * cdz);
      if (distFromStart > maxDistFromStart) maxDistFromStart = distFromStart;

      if (
        i >= ORBIT_MIN_STEPS &&
        maxDistFromStart > ORBIT_AWAY_DIST &&
        distFromStart < orbitCloseDist
      ) {
        // Snap the closure point back to start (world-space)
        positions[i * 2] = primary ? originX + primary.posX : originX;
        positions[i * 2 + 1] = primary ? originZ + primary.posZ : originZ;
        orbitClosedAt = i;
        activeSteps = i + 1;
        break;
      }
    }
  }

  return {
    positions,
    activeSteps,
    periStep,
    apoStep,
    periDist,
    apoDist,
    orbitClosedAt,
    primaryBodyId: primary?.id ?? null,
  };
}
