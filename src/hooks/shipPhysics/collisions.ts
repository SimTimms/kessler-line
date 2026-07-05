import * as THREE from 'three';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { gravityBodies } from '../../context/GravityRegistry';
import {
  DAMAGE_MULTIPLIER,
  RESTITUTION,
  SHIP_COLLISION_ID,
  SHIP_RADIUS,
  damageHull,
  shipDestroyed,
} from '../../context/ShipState';
import { SHIP_COLLISION_SAMPLES } from '../../config/shipConfig';
import { PLANET_IMPACT_MIN_SPEED } from '../../config/planetImpactConfig';
import { triggerShipDestruction } from './destruction';

const _shipWorldPos = new THREE.Vector3();
const _shipWorldQuat = new THREE.Quaternion();
const _localSample = new THREE.Vector3();
const _samplePos = new THREE.Vector3();
const _collidablePos = new THREE.Vector3();
const _collidableVel = new THREE.Vector3();
const _relVelocity = new THREE.Vector3();
const _collisionNormal = new THREE.Vector3();
const _impulse = new THREE.Vector3();
const _boxQuat = new THREE.Quaternion();
const _invBoxQuat = new THREE.Quaternion();
const _localShipPos = new THREE.Vector3();
const _closestPoint = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _capsuleA = new THREE.Vector3();
const _capsuleB = new THREE.Vector3();
const _surfacePoint = new THREE.Vector3();
const _surfaceNormal = new THREE.Vector3();
const _randomDir = new THREE.Vector3();

function isDockingBayCollidable(id: string): boolean {
  return id.startsWith('docking-bay-');
}

function shouldResolvePhysicalCollision(collidable: CollidableEntry): boolean {
  if (collidable.id === SHIP_COLLISION_ID) return false;
  if (isDockingBayCollidable(collidable.id)) return false;
  if (collidable.physicalCollision === false) return false;
  return true;
}

function getCollidableWorldVelocity(collidable: CollidableEntry, target: THREE.Vector3): THREE.Vector3 {
  if (collidable.getWorldVelocity) {
    return collidable.getWorldVelocity(target);
  }
  if (collidable.id.startsWith('planet-surface-')) {
    const body = gravityBodies.get(collidable.id.slice('planet-surface-'.length));
    return body ? target.copy(body.velocity) : target.set(0, 0, 0);
  }
  return target.set(0, 0, 0);
}

function resolveEntryCollision(
  collidable: CollidableEntry,
  shipPos: THREE.Vector3,
  velocity: THREE.Vector3,
  group: THREE.Object3D,
  sampleRadius = SHIP_RADIUS
) {
  // Docking bays are capture volumes, not solid walls — `checkDockingPort` handles attach.
  if (isDockingBayCollidable(collidable.id)) return;

  const shape = collidable.shape;
  let colliding = false;
  let overlap = 0;

  if (shape.type === 'sphere') {
    const dist = shipPos.distanceTo(_collidablePos);
    const minDist = sampleRadius + shape.radius;
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
    if (dist > 0.001 && dist < sampleRadius) {
      colliding = true;
      overlap = sampleRadius - dist;
      _collisionNormal.set(sepX / dist, sepY / dist, sepZ / dist).applyQuaternion(_boxQuat);
    } else if (dist <= 0.001) {
      const dx = shape.halfExtents.x - Math.abs(_localShipPos.x);
      const dy = shape.halfExtents.y - Math.abs(_localShipPos.y);
      const dz = shape.halfExtents.z - Math.abs(_localShipPos.z);
      colliding = true;
      if (dx <= dy && dx <= dz) {
        overlap = dx + sampleRadius;
        _collisionNormal.set(Math.sign(_localShipPos.x), 0, 0).applyQuaternion(_boxQuat);
      } else if (dy <= dz) {
        overlap = dy + sampleRadius;
        _collisionNormal.set(0, Math.sign(_localShipPos.y), 0).applyQuaternion(_boxQuat);
      } else {
        overlap = dz + sampleRadius;
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
    const minDist = sampleRadius + shape.radius;
    const dist = shipPos.distanceTo(_closestPoint);
    if (dist < minDist && dist > 0.001) {
      colliding = true;
      overlap = minDist - dist;
      _collisionNormal.subVectors(shipPos, _closestPoint).normalize();
    }
  }

  if (colliding) {
    // Closing speed must be measured relative to the collidable. Kinematic
    // movers (orbiting bodies, stations) carry their own world velocity; using
    // the ship's absolute velocity here makes a body the ship is travelling
    // alongside read as a high-speed impact and wrongly destroys the ship.
    getCollidableWorldVelocity(collidable, _collidableVel);
    const approachVelocity = _relVelocity.subVectors(velocity, _collidableVel);
    const impactSpeed = approachVelocity.dot(_collisionNormal);

    if (
      collidable.planetSurfaceImpact &&
      !shipDestroyed.current &&
      impactSpeed < -PLANET_IMPACT_MIN_SPEED
    ) {
      if (shape.type === 'sphere') {
        _surfaceNormal.copy(_collisionNormal);
        if (_surfaceNormal.lengthSq() < 1e-8) {
          _surfaceNormal.subVectors(shipPos, _collidablePos);
        }
        _surfaceNormal.normalize();
        _surfacePoint.copy(_collidablePos).addScaledVector(_surfaceNormal, shape.radius);
      } else {
        _surfacePoint.copy(shipPos);
        _surfaceNormal.copy(_collisionNormal).normalize();
      }

      window.dispatchEvent(
        new CustomEvent('PlanetSurfaceImpact', {
          detail: {
            position: _surfacePoint.clone(),
            normal: _surfaceNormal.clone(),
            planetId: collidable.id,
            impactSpeed: Math.abs(impactSpeed),
          },
        })
      );

      group.position.addScaledVector(_collisionNormal, overlap);
      shipPos.addScaledVector(_collisionNormal, overlap);
      velocity.set(0, 0, 0);
      triggerShipDestruction('planet');
      return;
    }

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
  group.getWorldQuaternion(_shipWorldQuat);

  for (const collidable of getCollidables()) {
    if (!shouldResolvePhysicalCollision(collidable)) continue;
    collidable.getWorldPosition(_collidablePos);

    for (const sample of SHIP_COLLISION_SAMPLES) {
      group.getWorldPosition(_shipWorldPos);
      _localSample.set(sample.local[0], sample.local[1], sample.local[2]);
      _samplePos.copy(_localSample).applyQuaternion(_shipWorldQuat).add(_shipWorldPos);
      resolveEntryCollision(collidable, _samplePos, velocity, group, sample.radius);
    }
  }
}
