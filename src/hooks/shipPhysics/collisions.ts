import * as THREE from 'three';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import {
  DAMAGE_MULTIPLIER,
  RESTITUTION,
  SHIP_COLLISION_ID,
  SHIP_RADIUS,
  damageHull,
} from '../../context/ShipState';

const _shipWorldPos = new THREE.Vector3();
const _collidablePos = new THREE.Vector3();
const _collisionNormal = new THREE.Vector3();
const _impulse = new THREE.Vector3();
const _boxQuat = new THREE.Quaternion();
const _invBoxQuat = new THREE.Quaternion();
const _localShipPos = new THREE.Vector3();
const _closestPoint = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _capsuleA = new THREE.Vector3();
const _capsuleB = new THREE.Vector3();

function resolveEntryCollision(
  collidable: CollidableEntry,
  shipPos: THREE.Vector3,
  velocity: THREE.Vector3,
  group: THREE.Object3D
) {
  const shape = collidable.shape;
  let colliding = false;
  let overlap = 0;

  if (shape.type === 'sphere') {
    const dist = shipPos.distanceTo(_collidablePos);
    const minDist = SHIP_RADIUS + shape.radius;
    if (dist < minDist && dist > 0.001) {
      colliding = true;
      overlap = minDist - dist;
      _collisionNormal.subVectors(shipPos, _collidablePos).normalize();
    }
  } else if (shape.type === 'box') {
    if (collidable.getWorldQuaternion) {
      collidable.getWorldQuaternion(_boxQuat);
    } else {
      _boxQuat.identity();
    }
    _invBoxQuat.copy(_boxQuat).invert();
    _localShipPos.subVectors(shipPos, _collidablePos).applyQuaternion(_invBoxQuat);
    _closestPoint.set(
      THREE.MathUtils.clamp(_localShipPos.x, -shape.halfExtents.x, shape.halfExtents.x),
      THREE.MathUtils.clamp(_localShipPos.y, -shape.halfExtents.y, shape.halfExtents.y),
      THREE.MathUtils.clamp(_localShipPos.z, -shape.halfExtents.z, shape.halfExtents.z)
    );
    const sepX = _localShipPos.x - _closestPoint.x;
    const sepY = _localShipPos.y - _closestPoint.y;
    const sepZ = _localShipPos.z - _closestPoint.z;
    const dist = Math.sqrt(sepX * sepX + sepY * sepY + sepZ * sepZ);
    if (dist > 0.001 && dist < SHIP_RADIUS) {
      colliding = true;
      overlap = SHIP_RADIUS - dist;
      _collisionNormal.set(sepX / dist, sepY / dist, sepZ / dist).applyQuaternion(_boxQuat);
    } else if (dist <= 0.001) {
      const dx = shape.halfExtents.x - Math.abs(_localShipPos.x);
      const dy = shape.halfExtents.y - Math.abs(_localShipPos.y);
      const dz = shape.halfExtents.z - Math.abs(_localShipPos.z);
      colliding = true;
      if (dx <= dy && dx <= dz) {
        overlap = dx + SHIP_RADIUS;
        _collisionNormal.set(Math.sign(_localShipPos.x), 0, 0).applyQuaternion(_boxQuat);
      } else if (dy <= dz) {
        overlap = dy + SHIP_RADIUS;
        _collisionNormal.set(0, Math.sign(_localShipPos.y), 0).applyQuaternion(_boxQuat);
      } else {
        overlap = dz + SHIP_RADIUS;
        _collisionNormal.set(0, 0, Math.sign(_localShipPos.z)).applyQuaternion(_boxQuat);
      }
    }
  } else if (shape.type === 'capsule') {
    if (collidable.getWorldQuaternion) {
      collidable.getWorldQuaternion(_boxQuat);
    } else {
      _boxQuat.identity();
    }
    const halfH = shape.height / 2;
    _localUp.set(0, 1, 0).applyQuaternion(_boxQuat);
    _capsuleA.copy(_collidablePos).addScaledVector(_localUp, -halfH);
    _capsuleB.copy(_collidablePos).addScaledVector(_localUp, halfH);
    const abX = _capsuleB.x - _capsuleA.x;
    const abY = _capsuleB.y - _capsuleA.y;
    const abZ = _capsuleB.z - _capsuleA.z;
    const abLenSq = abX * abX + abY * abY + abZ * abZ;
    const t =
      abLenSq > 0.0001
        ? THREE.MathUtils.clamp(
            ((shipPos.x - _capsuleA.x) * abX +
              (shipPos.y - _capsuleA.y) * abY +
              (shipPos.z - _capsuleA.z) * abZ) /
              abLenSq,
            0,
            1
          )
        : 0;
    _closestPoint.set(_capsuleA.x + abX * t, _capsuleA.y + abY * t, _capsuleA.z + abZ * t);
    const minDist = SHIP_RADIUS + shape.radius;
    const dist = shipPos.distanceTo(_closestPoint);
    if (dist < minDist && dist > 0.001) {
      colliding = true;
      overlap = minDist - dist;
      _collisionNormal.subVectors(shipPos, _closestPoint).normalize();
    }
  }

  if (colliding) {
    const impactSpeed = velocity.dot(_collisionNormal);
    if (impactSpeed < 0) {
      damageHull(Math.abs(impactSpeed) * DAMAGE_MULTIPLIER);
    }
    group.position.addScaledVector(_collisionNormal, overlap);
    shipPos.addScaledVector(_collisionNormal, overlap);
    if (impactSpeed < 0) {
      velocity.addScaledVector(_collisionNormal, -impactSpeed * (1 + RESTITUTION));
      if (collidable.applyImpulse) {
        // Pass normal * impactSpeed: negative impactSpeed * normal points away from ship approach
        _impulse.copy(_collisionNormal).multiplyScalar(impactSpeed);
        collidable.applyImpulse(_impulse);
      }
    }
  }
}

export function resolveCollisions(group: THREE.Object3D, velocity: THREE.Vector3) {
  group.getWorldPosition(_shipWorldPos);
  for (const collidable of getCollidables()) {
    if (collidable.id === SHIP_COLLISION_ID) continue;
    collidable.getWorldPosition(_collidablePos);
    resolveEntryCollision(collidable, _shipWorldPos, velocity, group);
  }
}
