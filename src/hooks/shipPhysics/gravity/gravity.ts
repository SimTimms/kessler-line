import * as THREE from 'three';
import { gravityBodies } from '../../../context/GravityRegistry';
import { orbitingBodyIdRef, orbitStatusRef } from '../../../context/ShipState';
import { renderToSimulationSpace } from '../../../context/FloatingOrigin';
import { stepGravity, computeOrbitalParameters } from '../../../physics';
import type { OrbitState } from '../../../physics';
import { playEnteringSoi } from './helpers/gravitySfx';

// Scratch vectors
const _shipWorldPos = new THREE.Vector3();
const _relPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();

// Orbital status throttle - update orbital status every n frames
const ORBITAL_STATUS_INTERVAL = 6;
let _orbitalStatusTick = 0;

export interface ApplyGravityStepParams {
  /** Whether to disable gravity. */
  disableGravity: boolean;
  /** The group to apply gravity to. */
  group: THREE.Object3D;
  /** The velocity to apply to the group. */
  velocity: THREE.Vector3;
  /** The primary gravity id. */
  primaryGravityId: { current: string | null };
  /** The primary gravity velocity. */
  primaryGravityVelocity: THREE.Vector3;
  /** The delta time. */
  dt: number;
}

export function applyGravityStep({
  disableGravity,
  group,
  velocity,
  primaryGravityId,
  primaryGravityVelocity,
  dt,
}: ApplyGravityStepParams): void {
  if (disableGravity) {
    orbitingBodyIdRef.current = null;
    orbitStatusRef.current.bodyId = null;
    orbitStatusRef.current.isOrbiting = false;
    orbitStatusRef.current.periapsis = 0;
    orbitStatusRef.current.apoapsis = 0;
    orbitStatusRef.current.surfaceRadius = 0;
    orbitStatusRef.current.hyperbolicPeriapsis = 0;
    if (primaryGravityId.current) {
      velocity.sub(primaryGravityVelocity);
      primaryGravityId.current = null;
      primaryGravityVelocity.set(0, 0, 0);
    }
    return;
  }

  group.getWorldPosition(_shipWorldPos);
  renderToSimulationSpace(_shipWorldPos, _shipWorldPos);

  // Build transient OrbitState pointing into existing ship refs
  const state: OrbitState = {
    position: _shipWorldPos,
    velocity,
    primaryBodyId: primaryGravityId.current,
    primaryBodyVelocity: primaryGravityVelocity,
  };

  const result = stepGravity(state, dt);

  // Sync back — stepGravity may have changed the primary body
  primaryGravityId.current = state.primaryBodyId;
  orbitingBodyIdRef.current = result.primaryBodyId;

  if (result.primaryBodyId !== null) {
    // SOI transition SFX
    if (result.soiTransition) {
      const { from, to } = result.soiTransition;
      if (from !== null && to !== 'Sun') {
        playEnteringSoi();
      }
    }

    // Orbital status — throttled; force update on SOI entry
    const bodyChanged = result.soiTransition !== null;
    _orbitalStatusTick++;
    if (bodyChanged || _orbitalStatusTick >= ORBITAL_STATUS_INTERVAL) {
      _orbitalStatusTick = 0;
      const primaryBody = gravityBodies.get(result.primaryBodyId!);
      if (primaryBody) {
        _relPos.subVectors(_shipWorldPos, primaryBody.position);
        _relVel.subVectors(velocity, primaryBody.velocity);
        const r = Math.sqrt(result.distSq);
        const params = computeOrbitalParameters(
          primaryBody,
          result.primaryBodyId,
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
    }
  } else {
    // Outside all SOIs — clear orbital status
    orbitStatusRef.current.bodyId = null;
    orbitStatusRef.current.isOrbiting = false;
    orbitStatusRef.current.periapsis = 0;
    orbitStatusRef.current.apoapsis = 0;
    orbitStatusRef.current.surfaceRadius = 0;
    orbitStatusRef.current.radialVelocity = 0;
    orbitStatusRef.current.hyperbolicPeriapsis = 0;
  }
}
