import * as THREE from 'three';
import { gravityBodies, type GravityBody } from '../../context/GravityRegistry';
import { orbitingBodyIdRef, orbitStatusRef } from '../../context/ShipState';

const _shipWorldPos = new THREE.Vector3();
const _gravDir = new THREE.Vector3();
const _primaryDeltaV = new THREE.Vector3();
const _relPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _hVec = new THREE.Vector3();

interface ApplyGravityStepParams {
  disableGravity: boolean;
  group: THREE.Object3D;
  velocity: THREE.Vector3;
  primaryGravityId: { current: string | null };
  primaryGravityVelocity: THREE.Vector3;
  dt: number;
  anyThrusting: boolean;
}

export function applyGravityStep({
  disableGravity,
  group,
  velocity,
  primaryGravityId,
  primaryGravityVelocity,
  dt,
  anyThrusting,
}: ApplyGravityStepParams) {
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
  let primaryBodyId: string | null = null;
  let primaryBody: GravityBody | null = null;
  let primaryAccel = 0;
  for (const [id, body] of gravityBodies) {
    const dist = _shipWorldPos.distanceTo(body.position);
    if (dist > body.surfaceRadius && dist < body.soiRadius) {
      const accel = body.mu / (dist * dist);
      if (accel > primaryAccel) {
        primaryAccel = accel;
        primaryBody = body;
        primaryBodyId = id;
      }
    }
  }

  orbitingBodyIdRef.current = primaryBodyId;
  if (primaryBody && primaryBodyId) {
    _gravDir.subVectors(primaryBody.position, _shipWorldPos).normalize();
    velocity.addScaledVector(_gravDir, primaryAccel * dt);
  }

  if (primaryBody && primaryBodyId) {
    _relPos.subVectors(_shipWorldPos, primaryBody.position);
    _relVel.subVectors(velocity, primaryBody.velocity);
    const r = _relPos.length();
    const radialVelocity = _relVel.dot(_relPos) / Math.max(r, 1e-6);
    const v2 = _relVel.lengthSq();
    const mu = primaryBody.mu;
    const energy = 0.5 * v2 - mu / Math.max(1e-6, r);

    let isOrbiting = false;
    let periapsis = 0;
    let apoapsis = 0;
    let hyperbolicPeriapsis = 0;

    // Angular momentum is valid for all conic types
    _hVec.copy(_relPos).cross(_relVel);
    const h2 = _hVec.lengthSq();

    if (energy < 0) {
      const a = -mu / (2 * energy);
      const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
      if (e < 1) {
        periapsis = h2 / (mu * (1 + e));
        apoapsis = a * (1 + e);
        if (periapsis > primaryBody.surfaceRadius) isOrbiting = true;
      }
    } else {
      // Hyperbolic trajectory — compute periapsis (formula valid for e > 1)
      const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
      if (e > 0) hyperbolicPeriapsis = h2 / (mu * (1 + e));
    }

    orbitStatusRef.current.bodyId = primaryBodyId;
    orbitStatusRef.current.isOrbiting = isOrbiting;
    orbitStatusRef.current.surfaceRadius = primaryBody.surfaceRadius;
    orbitStatusRef.current.radialVelocity = radialVelocity;
    orbitStatusRef.current.hyperbolicPeriapsis = hyperbolicPeriapsis;
    if (isOrbiting && !anyThrusting && orbitStatusRef.current.bodyId === primaryBodyId) {
      orbitStatusRef.current.periapsis = orbitStatusRef.current.periapsis || periapsis;
      orbitStatusRef.current.apoapsis = orbitStatusRef.current.apoapsis || apoapsis;
    } else {
      orbitStatusRef.current.periapsis = periapsis;
      orbitStatusRef.current.apoapsis = apoapsis;
    }
  } else {
    orbitStatusRef.current.bodyId = null;
    orbitStatusRef.current.isOrbiting = false;
    orbitStatusRef.current.periapsis = 0;
    orbitStatusRef.current.apoapsis = 0;
    orbitStatusRef.current.surfaceRadius = 0;
    orbitStatusRef.current.radialVelocity = 0;
    orbitStatusRef.current.hyperbolicPeriapsis = 0;
  }

  if (primaryBody && primaryBodyId) {
    if (primaryGravityId.current !== primaryBodyId) {
      if (primaryGravityId.current) {
        velocity.sub(primaryGravityVelocity);
      }
      primaryGravityId.current = primaryBodyId;
      primaryGravityVelocity.copy(primaryBody.velocity);
      velocity.add(primaryBody.velocity);
    } else {
      _primaryDeltaV.subVectors(primaryBody.velocity, primaryGravityVelocity);
      velocity.add(_primaryDeltaV);
      primaryGravityVelocity.copy(primaryBody.velocity);
    }
  } else if (primaryGravityId.current) {
    velocity.sub(primaryGravityVelocity);
    primaryGravityId.current = null;
    primaryGravityVelocity.set(0, 0, 0);
  }
}
