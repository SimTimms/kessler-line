import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { shipPosRef } from '../context/ShipPos';
import { orbitStatusRef } from '../context/ShipState';
import { getAltitudeAboveSurface } from './orbitAltitude';

const _fromBody = new THREE.Vector3();

/** Inbound toward the active gravity body (collision-course style). */
export function isInboundTowardPrimaryBody(): boolean {
  return orbitStatusRef.current.radialVelocity < 0;
}

export function shouldHoldCameraForPlanetImpact(holdMaxSurfaceAltitude: number): boolean {
  const altitude = getAltitudeAboveSurface();
  if (altitude === null || altitude > holdMaxSurfaceAltitude) return false;
  return isInboundTowardPrimaryBody();
}

/**
 * Keep the camera on or outside a shell at `surfaceRadius + holdSurfaceAltitude`
 * so it does not follow the ship into the planet.
 */
export function clampCameraForInboundPlanetHold(
  desiredCameraPos: THREE.Vector3,
  holdSurfaceAltitude: number
): void {
  const { bodyId } = orbitStatusRef.current;
  if (!bodyId) return;

  const body = gravityBodies.get(bodyId);
  if (!body) return;

  const minDist = body.surfaceRadius + holdSurfaceAltitude;
  _fromBody.subVectors(desiredCameraPos, body.position);
  const dist = _fromBody.length();
  if (dist >= minDist) return;

  if (_fromBody.lengthSq() < 1e-6) {
    _fromBody.subVectors(shipPosRef.current, body.position);
    if (_fromBody.lengthSq() < 1e-6) {
      _fromBody.set(1, 0, 0);
    }
  }
  _fromBody.normalize();
  desiredCameraPos.copy(body.position).addScaledVector(_fromBody, minDist);
}
