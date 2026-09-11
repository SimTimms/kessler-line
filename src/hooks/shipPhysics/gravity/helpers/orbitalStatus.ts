import * as THREE from 'three';
import { gravityBodies } from '../../../../context/GravityRegistry';
import { orbitStatusRef } from '../../../../context/ShipState';
import { computeOrbitalParameters } from '../../../../physics';

// Scratch vectors for relative position/velocity
const _relPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();

/** Reset all orbital status fields to their zero/null defaults. */
export function clearOrbitalStatus(): void {
  orbitStatusRef.current.bodyId = null;
  orbitStatusRef.current.isOrbiting = false;
  orbitStatusRef.current.periapsis = 0;
  orbitStatusRef.current.apoapsis = 0;
  orbitStatusRef.current.surfaceRadius = 0;
  orbitStatusRef.current.radialVelocity = 0;
  orbitStatusRef.current.hyperbolicPeriapsis = 0;
}

/**
 * Compute orbital parameters for the current primary body and write them
 * to `orbitStatusRef.current`.
 */
export function updateOrbitalStatus(
  shipWorldPos: THREE.Vector3,
  velocity: THREE.Vector3,
  primaryBodyId: string,
  distSq: number
): void {
  const primaryBody = gravityBodies.get(primaryBodyId);
  if (!primaryBody) return;

  _relPos.subVectors(shipWorldPos, primaryBody.position);
  _relVel.subVectors(velocity, primaryBody.velocity);
  const r = Math.sqrt(distSq);

  const params = computeOrbitalParameters(
    primaryBody,
    primaryBodyId,
    _relPos,
    _relVel,
    r
  );

  orbitStatusRef.current.bodyId = params.bodyId;
  orbitStatusRef.current.isOrbiting = params.isOrbiting;
  orbitStatusRef.current.surfaceRadius = params.surfaceRadius;
  orbitStatusRef.current.radialVelocity = params.radialVelocity;
  orbitStatusRef.current.hyperbolicPeriapsis = params.hyperbolicPeriapsis;
  orbitStatusRef.current.periapsis = params.periapsis;
  orbitStatusRef.current.apoapsis = params.apoapsis;
}
