import * as THREE from 'three';
import { CANNON_AIM_OFF_PLANE_Y, type ShipGunMountConfig } from '../../config/combatConfig';

/**
 * Aim muzzle → target. Horizontal (dir.y = 0) unless that target sits off
 * world Y = 0 (e.g. an elevated / sunken collidable).
 */
export function resolveCannonAimDirection(
  origin: THREE.Vector3,
  target: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  if (Math.abs(target.y) >= CANNON_AIM_OFF_PLANE_Y) {
    out.subVectors(target, origin);
    if (out.lengthSq() > 1e-12) return out.normalize();
  }

  out.set(target.x - origin.x, 0, target.z - origin.z);
  if (out.lengthSq() < 1e-12) {
    out.set(0, 0, -1);
  }
  return out.normalize();
}

/**
 * Clamp a world aim direction into this gun's yaw (and optional pitch) arc
 * about the mount's forward vector.
 */
export function clampAimToGunArc(
  desired: THREE.Vector3,
  gunForwardWorld: THREE.Vector3,
  gun: ShipGunMountConfig,
  out: THREE.Vector3
): THREE.Vector3 {
  const yawHalf = THREE.MathUtils.degToRad(gun.yawHalfArcDeg);
  const fLen = Math.hypot(gunForwardWorld.x, gunForwardWorld.z);
  const fx = fLen > 1e-8 ? gunForwardWorld.x / fLen : 0;
  const fz = fLen > 1e-8 ? gunForwardWorld.z / fLen : 1;

  const dHoriz = Math.hypot(desired.x, desired.z);
  const dx = dHoriz > 1e-8 ? desired.x / dHoriz : fx;
  const dz = dHoriz > 1e-8 ? desired.z / dHoriz : fz;

  const dot = fx * dx + fz * dz;
  const cross = fx * dz - fz * dx;
  const yaw = THREE.MathUtils.clamp(Math.atan2(cross, dot), -yawHalf, yawHalf);

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const rx = fx * cos - fz * sin;
  const rz = fx * sin + fz * cos;

  const desiredLen = desired.length() || 1;
  let elev = Math.asin(THREE.MathUtils.clamp(desired.y / desiredLen, -1, 1));
  if (gun.pitchHalfArcDeg !== undefined) {
    const pitchHalf = THREE.MathUtils.degToRad(gun.pitchHalfArcDeg);
    elev = THREE.MathUtils.clamp(elev, -pitchHalf, pitchHalf);
  }

  const ce = Math.cos(elev);
  out.set(rx * ce, Math.sin(elev), rz * ce);
  if (out.lengthSq() < 1e-12) out.set(fx, 0, fz);
  return out.normalize();
}
