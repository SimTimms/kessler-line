import * as THREE from 'three';
import type { CollidableEntry } from '../../context/CollisionRegistry';
import { PROJECTILE_RADIUS, type TestProjectile } from './spawnProjectile';

const PROJECTILE_RESTITUTION = 0.48;
const PROJECTILE_DRAG_ON_IMPACT = 0.9;
const IMPACT_VENT_MIN_SPEED = 4;
const IMPACT_VENT_COOLDOWN_MS = 120;

const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _invTargetQuat = new THREE.Quaternion();
const _localPos = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _collisionNormal = new THREE.Vector3();
const _capsuleA = new THREE.Vector3();
const _capsuleB = new THREE.Vector3();
const _capsuleUp = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();

/**
 * Tests a projectile against a collidable target and resolves the collision
 * (position correction, velocity reflection, optional vent VFX dispatch).
 */
export function collideProjectile(
  projectile: TestProjectile,
  target: CollidableEntry,
  preferredTargetId: string | undefined,
): void {
  target.getWorldPosition(_targetPos);
  const shape = target.shape;
  let hit = false;
  let overlap = 0;

  if (shape.type === 'sphere') {
    const dist = projectile.position.distanceTo(_targetPos);
    const minDist = PROJECTILE_RADIUS + shape.radius;
    if (dist < minDist && dist > 1e-6) {
      hit = true;
      overlap = minDist - dist;
      _collisionNormal.subVectors(projectile.position, _targetPos).normalize();
    }
  } else if (shape.type === 'box') {
    if (target.getWorldQuaternion) target.getWorldQuaternion(_targetQuat);
    else _targetQuat.identity();
    _invTargetQuat.copy(_targetQuat).invert();
    _localPos.copy(projectile.position).sub(_targetPos).applyQuaternion(_invTargetQuat);
    _closest.set(
      THREE.MathUtils.clamp(_localPos.x, -shape.halfExtents.x, shape.halfExtents.x),
      THREE.MathUtils.clamp(_localPos.y, -shape.halfExtents.y, shape.halfExtents.y),
      THREE.MathUtils.clamp(_localPos.z, -shape.halfExtents.z, shape.halfExtents.z)
    );
    const sx = _localPos.x - _closest.x;
    const sy = _localPos.y - _closest.y;
    const sz = _localPos.z - _closest.z;
    const dist = Math.sqrt(sx * sx + sy * sy + sz * sz);
    if (dist > 1e-6 && dist < PROJECTILE_RADIUS) {
      hit = true;
      overlap = PROJECTILE_RADIUS - dist;
      _collisionNormal.set(sx / dist, sy / dist, sz / dist).applyQuaternion(_targetQuat);
    } else if (dist <= 1e-6) {
      const dx = shape.halfExtents.x - Math.abs(_localPos.x);
      const dy = shape.halfExtents.y - Math.abs(_localPos.y);
      const dz = shape.halfExtents.z - Math.abs(_localPos.z);
      hit = true;
      if (dx <= dy && dx <= dz) {
        overlap = dx + PROJECTILE_RADIUS;
        _collisionNormal.set(Math.sign(_localPos.x) || 1, 0, 0).applyQuaternion(_targetQuat);
      } else if (dy <= dz) {
        overlap = dy + PROJECTILE_RADIUS;
        _collisionNormal.set(0, Math.sign(_localPos.y) || 1, 0).applyQuaternion(_targetQuat);
      } else {
        overlap = dz + PROJECTILE_RADIUS;
        _collisionNormal.set(0, 0, Math.sign(_localPos.z) || 1).applyQuaternion(_targetQuat);
      }
    }
  } else if (shape.type === 'capsule') {
    if (target.getWorldQuaternion) target.getWorldQuaternion(_targetQuat);
    else _targetQuat.identity();
    const halfH = shape.height * 0.5;
    _capsuleUp.set(0, 1, 0).applyQuaternion(_targetQuat);
    _capsuleA.copy(_targetPos).addScaledVector(_capsuleUp, -halfH);
    _capsuleB.copy(_targetPos).addScaledVector(_capsuleUp, halfH);
    const abx = _capsuleB.x - _capsuleA.x;
    const aby = _capsuleB.y - _capsuleA.y;
    const abz = _capsuleB.z - _capsuleA.z;
    const abLenSq = abx * abx + aby * aby + abz * abz;
    const t =
      abLenSq > 1e-6
        ? THREE.MathUtils.clamp(
            ((projectile.position.x - _capsuleA.x) * abx +
              (projectile.position.y - _capsuleA.y) * aby +
              (projectile.position.z - _capsuleA.z) * abz) /
              abLenSq,
            0,
            1
          )
        : 0;
    _closest.set(_capsuleA.x + abx * t, _capsuleA.y + aby * t, _capsuleA.z + abz * t);
    const minDist = PROJECTILE_RADIUS + shape.radius;
    const dist = projectile.position.distanceTo(_closest);
    if (dist < minDist && dist > 1e-6) {
      hit = true;
      overlap = minDist - dist;
      _collisionNormal.subVectors(projectile.position, _closest).normalize();
    }
  }

  if (!hit) return;
  projectile.position.addScaledVector(_collisionNormal, overlap);
  const normalSpeed = projectile.velocity.dot(_collisionNormal);
  if (normalSpeed < 0) {
    projectile.velocity.addScaledVector(
      _collisionNormal,
      -normalSpeed * (1 + PROJECTILE_RESTITUTION)
    );
    projectile.velocity.multiplyScalar(PROJECTILE_DRAG_ON_IMPACT);

    const ventTargetId = preferredTargetId ?? projectile.targetId;
    const shouldVent =
      target.id === ventTargetId &&
      !target.id.startsWith('docking-bay-') &&
      -normalSpeed >= IMPACT_VENT_MIN_SPEED &&
      performance.now() >= projectile.nextVentAtMs;

    if (shouldVent) {
      _hitPoint.copy(projectile.position).addScaledVector(_collisionNormal, -PROJECTILE_RADIUS);
      window.dispatchEvent(
        new CustomEvent('RailgunDamagePoints', {
          detail: {
            points: [
              {
                x: _hitPoint.x,
                y: _hitPoint.y,
                z: _hitPoint.z,
                nx: _collisionNormal.x,
                ny: _collisionNormal.y,
                nz: _collisionNormal.z,
              },
            ],
          },
        })
      );
      projectile.nextVentAtMs = performance.now() + IMPACT_VENT_COOLDOWN_MS;
    }
  }
}
