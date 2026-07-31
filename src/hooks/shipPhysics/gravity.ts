import * as THREE from 'three';
import { gravityBodies, type GravityBody } from '../../context/GravityRegistry';
import { orbitingBodyIdRef, orbitStatusRef } from '../../context/ShipState';
import { renderToSimulationSpace } from '../../context/FloatingOrigin';

// ── Scratch vectors (module-level — never allocated per-frame) ─────────────
const _shipWorldPos = new THREE.Vector3();
const _gravDir = new THREE.Vector3();
const _primaryDeltaV = new THREE.Vector3();
const _relPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _hVec = new THREE.Vector3();

// ── Orbital status throttle ────────────────────────────────────────────────
// Periapsis / apoapsis update slowly — no need to recompute every physics tick.
// At 60 fps with interval=6 the HUD refreshes at ~10 Hz, imperceptible to players.
const ORBITAL_STATUS_INTERVAL = 6;
let _orbitalStatusTick = 0;

// ── Types ──────────────────────────────────────────────────────────────────

interface PrimaryBodyResult {
  body: GravityBody;
  id: string;
  /** Squared distance from ship to body centre — avoids a second sqrt later. */
  distSq: number;
}

export interface ApplyGravityStepParams {
  disableGravity: boolean;
  group: THREE.Object3D;
  velocity: THREE.Vector3;
  primaryGravityId: { current: string | null };
  primaryGravityVelocity: THREE.Vector3;
  dt: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find the gravity body exerting the greatest acceleration on the ship.
 *
 * Uses `distanceToSquared` to skip a `Math.sqrt` per body per frame.
 * Since accel = mu / r², we use distSq directly without ever taking a root.
 */
function findPrimaryBody(shipPos: THREE.Vector3): PrimaryBodyResult | null {
  let primaryAccel = 0;
  let result: PrimaryBodyResult | null = null;

  for (const [id, body] of gravityBodies) {
    const distSq = shipPos.distanceToSquared(body.position);
    const srSq = body.surfaceRadius * body.surfaceRadius;
    const soiSq = body.soiRadius * body.soiRadius;
    if (distSq > srSq && distSq < soiSq) {
      const accel = body.mu / distSq; // accel ∝ mu/r²; distSq == r²
      if (accel > primaryAccel) {
        primaryAccel = accel;
        result = { body, id, distSq };
      }
    }
  }

  return result;
}

/**
 * Compute and write orbital conic parameters (periapsis, apoapsis, eccentricity)
 * to `orbitStatusRef`. Intended to be called on a throttled cadence — these
 * values change slowly during flight and don't need per-frame precision.
 *
 * @param r - Ship-to-body distance (pre-computed `Math.sqrt(distSq)` reused here).
 */
function updateOrbitalStatus(
  body: GravityBody,
  bodyId: string,
  relPos: THREE.Vector3,
  relVel: THREE.Vector3,
  r: number,
): void {
  const mu = body.mu;
  const v2 = relVel.lengthSq();
  const energy = 0.5 * v2 - mu / Math.max(r, 1e-6);
  const radialVelocity = relVel.dot(relPos) / Math.max(r, 1e-6);

  _hVec.copy(relPos).cross(relVel);
  const h2 = _hVec.lengthSq();

  let isOrbiting = false;
  let periapsis = 0;
  let apoapsis = 0;
  let hyperbolicPeriapsis = 0;

  if (energy < 0) {
    const a = -mu / (2 * energy);
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
    if (e < 1) {
      periapsis = h2 / (mu * (1 + e));
      apoapsis = a * (1 + e);
      if (periapsis > body.surfaceRadius) isOrbiting = true;
    }
  } else {
    // Hyperbolic trajectory
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
    if (e > 0) hyperbolicPeriapsis = h2 / (mu * (1 + e));
  }

  orbitStatusRef.current.bodyId = bodyId;
  orbitStatusRef.current.isOrbiting = isOrbiting;
  orbitStatusRef.current.surfaceRadius = body.surfaceRadius;
  orbitStatusRef.current.radialVelocity = radialVelocity;
  orbitStatusRef.current.hyperbolicPeriapsis = hyperbolicPeriapsis;
  orbitStatusRef.current.periapsis = periapsis;
  orbitStatusRef.current.apoapsis = apoapsis;
}

// ── Main export ────────────────────────────────────────────────────────────

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

  const primary = findPrimaryBody(_shipWorldPos);
  orbitingBodyIdRef.current = primary?.id ?? null;

  if (primary) {
    const { body, id: bodyId, distSq } = primary;

    // Apply gravitational pull: a = mu/r² toward body centre
    _gravDir.subVectors(body.position, _shipWorldPos).normalize();
    velocity.addScaledVector(_gravDir, (body.mu / distSq) * dt);

    // Orbital status — throttled; force update immediately on SOI entry
    const bodyChanged = primaryGravityId.current !== bodyId;
    _orbitalStatusTick++;
    if (bodyChanged || _orbitalStatusTick >= ORBITAL_STATUS_INTERVAL) {
      _orbitalStatusTick = 0;
      _relPos.subVectors(_shipWorldPos, body.position);
      _relVel.subVectors(velocity, body.velocity);
      const r = Math.sqrt(distSq); // single sqrt — reuses distSq found above
      updateOrbitalStatus(body, bodyId, _relPos, _relVel, r);
    }

    // SOI transition — rebase velocity into the new primary body's reference frame
    if (bodyChanged) {
      if (primaryGravityId.current) velocity.sub(primaryGravityVelocity);
      primaryGravityId.current = bodyId;
      primaryGravityVelocity.copy(body.velocity);
      velocity.add(body.velocity);
    } else {
      _primaryDeltaV.subVectors(body.velocity, primaryGravityVelocity);
      velocity.add(_primaryDeltaV);
      primaryGravityVelocity.copy(body.velocity);
    }
  } else {
    // Outside all SOIs — clear orbital status and exit reference frame
    orbitStatusRef.current.bodyId = null;
    orbitStatusRef.current.isOrbiting = false;
    orbitStatusRef.current.periapsis = 0;
    orbitStatusRef.current.apoapsis = 0;
    orbitStatusRef.current.surfaceRadius = 0;
    orbitStatusRef.current.radialVelocity = 0;
    orbitStatusRef.current.hyperbolicPeriapsis = 0;

    if (primaryGravityId.current) {
      velocity.sub(primaryGravityVelocity);
      primaryGravityId.current = null;
      primaryGravityVelocity.set(0, 0, 0);
    }
  }
}
