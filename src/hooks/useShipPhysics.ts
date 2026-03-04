import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  THRUST,
  YAW_THRUST,
  SHIP_RADIUS,
  RESTITUTION,
  DAMAGE_MULTIPLIER,
  SHIP_COLLISION_ID,
  DOCKING_PORT_RADIUS,
  DOCKING_PORT_LOCAL_Z,
  power,
  hullIntegrity,
  fuel,
  o2,
  setPower,
  setFuel,
  setO2,
  damageHull,
  shipVelocity,
  shipAcceleration,
  shipQuaternion,
  isRefueling,
  isTransferringO2,
  thrustMultiplier,
  shipDestroyed,
} from '../context/ShipState';
import { getCollidables } from '../context/CollisionRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { driveSignatureOnRef } from '../context/DriveSignatureScan';

// Module-level scratch vectors — reused every frame to avoid GC pressure
const _portWorldPos = new THREE.Vector3();
const _localForward = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _shipWorldPos = new THREE.Vector3();
const _collidablePos = new THREE.Vector3();
const _collisionNormal = new THREE.Vector3();
const _boxQuat = new THREE.Quaternion();
const _invBoxQuat = new THREE.Quaternion();
const _localShipPos = new THREE.Vector3();
const _closestPoint = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _capsuleA = new THREE.Vector3();
const _capsuleB = new THREE.Vector3();

interface UseShipPhysicsParams {
  groupRef: React.RefObject<THREE.Group>;
  dockingPortRef: React.RefObject<THREE.Group>;
  positionRef?: { current: THREE.Vector3 };
}

export interface UseShipPhysicsResult {
  thrustForward: React.MutableRefObject<boolean>;
  thrustReverse: React.MutableRefObject<boolean>;
  thrustLeft: React.MutableRefObject<boolean>;
  thrustRight: React.MutableRefObject<boolean>;
  thrustStrafeLeft: React.MutableRefObject<boolean>;
  thrustStrafeRight: React.MutableRefObject<boolean>;
  releaseParticleTrigger: React.MutableRefObject<boolean>;
  thrusterLightRef: React.RefObject<THREE.PointLight>;
}

export function useShipPhysics({
  groupRef,
  dockingPortRef,
  positionRef,
}: UseShipPhysicsParams): UseShipPhysicsResult {
  const velocity = useRef(new THREE.Vector3());
  const angularVelocity = useRef(0); // yaw rate in rad/s — no drag, persists like linear velocity
  const dockedTo = useRef<string | null>(null); // collision ID of the docked bay, or null

  const releaseParticleTrigger = useRef(false);
  const thrusterLightRef = useRef<THREE.PointLight>(null!);
  const thrusterLightIntensity = useRef(0);

  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false);    // A: yaw left
  const thrustRight = useRef(false);   // D: yaw right
  const thrustStrafeLeft = useRef(false);  // Q: strafe port
  const thrustStrafeRight = useRef(false); // E: strafe starboard

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = true;
      if (e.code === 'KeyS') thrustReverse.current = true;
      if (e.code === 'KeyA') thrustLeft.current = true;
      if (e.code === 'KeyD') thrustRight.current = true;
      if (e.code === 'KeyE') thrustStrafeLeft.current = true;
      if (e.code === 'KeyQ') thrustStrafeRight.current = true;
      if (e.code === 'Space' && dockedTo.current) {
        dockedTo.current = null;
        window.dispatchEvent(new CustomEvent('ShipUndocked'));
        if (groupRef.current) {
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
          velocity.current.copy(forward.multiplyScalar(4)); // 4 m/s release velocity
        }
        releaseParticleTrigger.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = false;
      if (e.code === 'KeyS') thrustReverse.current = false;
      if (e.code === 'KeyA') thrustLeft.current = false;
      if (e.code === 'KeyD') thrustRight.current = false;
      if (e.code === 'KeyE') thrustStrafeLeft.current = false;
      if (e.code === 'KeyQ') thrustStrafeRight.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [groupRef]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (shipDestroyed.current) return;

    // ── DOCKED: follow the bay's world position and rotation, skip physics ────
    if (dockedTo.current) {
      const dockerEntry = getCollidables().find((c) => c.id === dockedTo.current);
      if (dockerEntry) {
        dockerEntry.getWorldPosition(_collidablePos);
        if (dockerEntry.getWorldQuaternion) {
          dockerEntry.getWorldQuaternion(_boxQuat);
          groupRef.current.quaternion.copy(_boxQuat);
        }
        _localForward.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat);
        groupRef.current.position.copy(_collidablePos).sub(_localForward);
      }
      shipVelocity.set(0, 0, 0);
      shipAcceleration.current = 0;
      thrusterLightIntensity.current = 0;
      if (thrusterLightRef.current) thrusterLightRef.current.intensity = 0;
      if (isRefueling.current) setFuel(Math.min(100, fuel + 10 * delta));
      if (isTransferringO2.current) setO2(Math.min(100, o2 + 10 * delta));
      setO2(Math.max(0, o2 - 1 * delta));
      if (positionRef) positionRef.current.copy(groupRef.current.position);
      minimapShipPosition.copy(groupRef.current.position);
      return;
    }

    // ── Yaw ──────────────────────────────────────────────────────────────────
    if (thrustLeft.current) angularVelocity.current -= YAW_THRUST * delta;
    if (thrustRight.current) angularVelocity.current += YAW_THRUST * delta;
    groupRef.current.rotation.y += angularVelocity.current * delta;

    // ── Linear thrust ─────────────────────────────────────────────────────────
    _localForward.set(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
    if (thrustForward.current)
      velocity.current.addScaledVector(_localForward, THRUST * thrustMultiplier.current * delta);
    if (thrustReverse.current)
      velocity.current.addScaledVector(_localForward, -THRUST * thrustMultiplier.current * delta);

    _localRight.set(1, 0, 0).applyQuaternion(groupRef.current.quaternion);
    if (thrustStrafeLeft.current)
      velocity.current.addScaledVector(_localRight, -THRUST * delta);
    if (thrustStrafeRight.current)
      velocity.current.addScaledVector(_localRight, THRUST * delta);

    groupRef.current.position.addScaledVector(velocity.current, delta);
    shipVelocity.copy(velocity.current);
    groupRef.current.getWorldQuaternion(shipQuaternion);

    const isLinearThrusting =
      thrustForward.current || thrustReverse.current ||
      thrustStrafeLeft.current || thrustStrafeRight.current;
    shipAcceleration.current = isLinearThrusting ? THRUST * thrustMultiplier.current : 0;

    // ── Power, fuel, O2 drain ─────────────────────────────────────────────────
    const keysHeld =
      (thrustForward.current ? 1 : 0) +
      (thrustReverse.current ? 1 : 0) +
      (thrustLeft.current ? 1 : 0) +
      (thrustRight.current ? 1 : 0) +
      (thrustStrafeLeft.current ? 1 : 0) +
      (thrustStrafeRight.current ? 1 : 0);
    if (keysHeld > 0) {
      setPower(Math.max(0, power - keysHeld * delta));
      setFuel(Math.max(0, fuel - keysHeld * delta));
    }
    if (driveSignatureOnRef.current) {
      setPower(Math.max(0, power - 2 * delta));
    }

    // ── Thruster point light ──────────────────────────────────────────────────
    const anyThrusting =
      thrustForward.current || thrustReverse.current ||
      thrustStrafeLeft.current || thrustStrafeRight.current ||
      thrustLeft.current || thrustRight.current;
    const targetIntensity = anyThrusting ? 4 * thrustMultiplier.current : 0;
    thrusterLightIntensity.current = THREE.MathUtils.lerp(
      thrusterLightIntensity.current, targetIntensity, delta * 20
    );
    if (thrusterLightRef.current)
      thrusterLightRef.current.intensity = thrusterLightIntensity.current;

    // ── Collision detection ───────────────────────────────────────────────────
    groupRef.current.getWorldPosition(_shipWorldPos);
    for (const collidable of getCollidables()) {
      if (collidable.id === SHIP_COLLISION_ID) continue;
      collidable.getWorldPosition(_collidablePos);

      const shape = collidable.shape;
      let colliding = false;
      let overlap = 0;

      if (shape.type === 'sphere') {
        const dist = _shipWorldPos.distanceTo(_collidablePos);
        const minDist = SHIP_RADIUS + shape.radius;
        if (dist < minDist && dist > 0.001) {
          colliding = true;
          overlap = minDist - dist;
          _collisionNormal.subVectors(_shipWorldPos, _collidablePos).normalize();
        }
      } else if (shape.type === 'box') {
        if (collidable.getWorldQuaternion) {
          collidable.getWorldQuaternion(_boxQuat);
        } else {
          _boxQuat.identity();
        }
        _invBoxQuat.copy(_boxQuat).invert();
        _localShipPos.subVectors(_shipWorldPos, _collidablePos).applyQuaternion(_invBoxQuat);
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
                ((_shipWorldPos.x - _capsuleA.x) * abX +
                  (_shipWorldPos.y - _capsuleA.y) * abY +
                  (_shipWorldPos.z - _capsuleA.z) * abZ) /
                  abLenSq,
                0,
                1
              )
            : 0;
        _closestPoint.set(_capsuleA.x + abX * t, _capsuleA.y + abY * t, _capsuleA.z + abZ * t);
        const minDist = SHIP_RADIUS + shape.radius;
        const dist = _shipWorldPos.distanceTo(_closestPoint);
        if (dist < minDist && dist > 0.001) {
          colliding = true;
          overlap = minDist - dist;
          _collisionNormal.subVectors(_shipWorldPos, _closestPoint).normalize();
        }
      }

      if (colliding) {
        const impactSpeed = velocity.current.dot(_collisionNormal);
        if (impactSpeed < 0) {
          damageHull(Math.abs(impactSpeed) * DAMAGE_MULTIPLIER);
        }
        groupRef.current.position.addScaledVector(_collisionNormal, overlap);
        if (impactSpeed < 0) {
          velocity.current.addScaledVector(_collisionNormal, -impactSpeed * (1 + RESTITUTION));
        }
      }
    }

    // ── Destruction ───────────────────────────────────────────────────────────
    if (hullIntegrity <= 0) {
      shipDestroyed.current = true;
      groupRef.current.visible = false;
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      window.dispatchEvent(new CustomEvent('ShipDestroyed'));
      return;
    }

    // ── Docking port check ────────────────────────────────────────────────────
    if (!dockedTo.current && dockingPortRef.current) {
      dockingPortRef.current.getWorldPosition(_portWorldPos);
      const bayEntry = getCollidables().find((c) => {
        if (c.id === SHIP_COLLISION_ID) return false;
        if (c.shape.type !== 'box') return false;
        if (!c.id.startsWith('docking-bay')) return false;
        c.getWorldPosition(_collidablePos);
        if (c.getWorldQuaternion) {
          c.getWorldQuaternion(_boxQuat);
        } else {
          _boxQuat.identity();
        }
        _invBoxQuat.copy(_boxQuat).invert();
        _localShipPos.subVectors(_portWorldPos, _collidablePos).applyQuaternion(_invBoxQuat);
        const he = c.shape.halfExtents;
        const px = _localShipPos.x - THREE.MathUtils.clamp(_localShipPos.x, -he.x, he.x);
        const py = _localShipPos.y - THREE.MathUtils.clamp(_localShipPos.y, -he.y, he.y);
        const pz = _localShipPos.z - THREE.MathUtils.clamp(_localShipPos.z, -he.z, he.z);
        return Math.sqrt(px * px + py * py + pz * pz) < DOCKING_PORT_RADIUS;
      });
      if (bayEntry && velocity.current.length() < 4) {
        dockedTo.current = bayEntry.id;
        window.dispatchEvent(new CustomEvent('ShipDocked', { detail: { stationId: bayEntry.stationId ?? null } }));
        velocity.current.set(0, 0, 0);
        angularVelocity.current = 0;
        bayEntry.getWorldPosition(_collidablePos);
        if (bayEntry.getWorldQuaternion) {
          bayEntry.getWorldQuaternion(_boxQuat);
        } else {
          _boxQuat.identity();
        }
        groupRef.current.quaternion.copy(_boxQuat);
        _localForward.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat);
        groupRef.current.position.copy(_collidablePos).sub(_localForward);
      }
    }

    // ── Lock to Y=0 plane ─────────────────────────────────────────────────────
    velocity.current.y = 0;
    groupRef.current.position.y = 0;

    setO2(Math.max(0, o2 - 1 * delta));

    if (positionRef) positionRef.current.copy(groupRef.current.position);
    minimapShipPosition.copy(groupRef.current.position);
  });

  return {
    thrustForward,
    thrustReverse,
    thrustLeft,
    thrustRight,
    thrustStrafeLeft,
    thrustStrafeRight,
    releaseParticleTrigger,
    thrusterLightRef,
  };
}
