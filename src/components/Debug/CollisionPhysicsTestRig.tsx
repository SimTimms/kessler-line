import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  registerCollidable,
  unregisterCollidable,
  getCollidables,
  type CollidableEntry,
} from '../../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../../context/ShipState';
import {
  DEBUG_COLLISION_PHYSICS_TESTS,
  DEBUG_COLLISION_TEST_PROJECTILE_SPEED,
  DEBUG_COLLISION_TEST_SPAWN_DISTANCE,
} from '../../config/debugConfig';

const MAX_PROJECTILES = 48;
const PROJECTILE_RADIUS = 2.4;
const PROJECTILE_LIFETIME_SEC = 14;
const PROJECTILE_IMPULSE_SCALE = 0.14;
const PROJECTILE_RESTITUTION = 0.48;
const PROJECTILE_DRAG_ON_IMPACT = 0.9;

const TOGGLE_KEY = 'F8';
const FIRE_KEY = 'KeyJ';
const BURST_KEY = 'KeyK';
const BURST_COUNT = 5;

export const EVENT_COLLISION_TEST_TOGGLE = 'DebugCollisionTestToggle';
export const EVENT_COLLISION_TEST_SET_MODE = 'DebugCollisionTestSetMode';
export const EVENT_COLLISION_TEST_FIRE = 'DebugCollisionTestFire';
export const EVENT_COLLISION_TEST_BURST = 'DebugCollisionTestBurst';

type TestProjectile = {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ageSec: number;
  targetId: string;
  nextVentAtMs: number;
};

const _shipPos = new THREE.Vector3();
const _shipVel = new THREE.Vector3();
const _spawnDir = new THREE.Vector3();
const _spawnPos = new THREE.Vector3();
const _toShip = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _dummy = new THREE.Object3D();
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
const IMPACT_VENT_MIN_SPEED = 4;
const IMPACT_VENT_COOLDOWN_MS = 120;

const panelStyle: CSSProperties = {
  position: 'fixed',
  top: 14,
  right: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '8px 10px',
  border: '1px solid rgba(255, 85, 85, 0.45)',
  background: 'rgba(10, 0, 0, 0.72)',
  color: 'rgba(255, 200, 200, 0.95)',
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  pointerEvents: 'auto',
  zIndex: 9999,
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
};

const buttonStyle: CSSProperties = {
  border: '1px solid rgba(255, 120, 120, 0.55)',
  background: 'rgba(35, 0, 0, 0.8)',
  color: 'rgba(255, 210, 210, 0.95)',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: 'inherit',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

interface CollisionPhysicsTestRigProps {
  enabled?: boolean;
  showPanel?: boolean;
  defaultAimPosition?: [number, number, number];
  preferredTargetId?: string;
}

export default function CollisionPhysicsTestRig({
  enabled = DEBUG_COLLISION_PHYSICS_TESTS,
  showPanel = true,
  defaultAimPosition,
  preferredTargetId,
}: CollisionPhysicsTestRigProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const projectilesRef = useRef<TestProjectile[]>([]);
  const nextProjectileIdRef = useRef(1);
  const [testModeActive, setTestModeActive] = useState(false);
  const testModeActiveRef = useRef(testModeActive);
  const defaultAimRef = useRef(
    defaultAimPosition
      ? new THREE.Vector3(defaultAimPosition[0], defaultAimPosition[1], defaultAimPosition[2])
      : null
  );

  useEffect(() => {
    testModeActiveRef.current = testModeActive;
  }, [testModeActive]);

  useEffect(() => {
    defaultAimRef.current = defaultAimPosition
      ? new THREE.Vector3(defaultAimPosition[0], defaultAimPosition[1], defaultAimPosition[2])
      : null;
  }, [defaultAimPosition]);

  const findCollisionTarget = useCallback((): CollidableEntry | null => {
    const collidables = getCollidables();
    if (preferredTargetId) {
      const preferred = collidables.find((entry) => entry.id === preferredTargetId);
      if (preferred) return preferred;
    }
    const shipTarget = collidables.find((entry) => entry.id === SHIP_COLLISION_ID);
    if (shipTarget) return shipTarget;
    return (
      collidables.find(
        (entry) =>
          !entry.id.startsWith('debug-collision-test-') &&
          !entry.id.startsWith('docking-bay-') &&
          entry.physicalCollision !== false
      ) ?? null
    );
  }, [preferredTargetId]);

  const clearProjectiles = useCallback(() => {
    for (const projectile of projectilesRef.current) {
      unregisterCollidable(projectile.id);
    }
    projectilesRef.current.length = 0;
  }, []);

  const toggleTestMode = useCallback(() => {
    setTestModeActive((current) => {
      const next = !current;
      if (!next) clearProjectiles();
      return next;
    });
  }, [clearProjectiles]);

  const spawnProjectile = useCallback(() => {
    const target = findCollisionTarget();
    if (target) {
      target.getWorldPosition(_shipPos);
      if (target.getWorldVelocity) {
        target.getWorldVelocity(_shipVel);
      } else {
        _shipVel.set(0, 0, 0);
      }
    } else {
      if (!defaultAimRef.current) return;
      _shipPos.copy(defaultAimRef.current);
      _shipVel.set(0, 0, 0);
    }

    _spawnDir.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5).normalize();
    if (_spawnDir.lengthSq() < 1e-6) _spawnDir.copy(_up);
    _spawnPos.copy(_shipPos).addScaledVector(_spawnDir, DEBUG_COLLISION_TEST_SPAWN_DISTANCE);
    _toShip.subVectors(_shipPos, _spawnPos).normalize();

    const id = `debug-collision-test-${nextProjectileIdRef.current++}`;
    const projectile: TestProjectile = {
      id,
      position: _spawnPos.clone(),
      velocity: _shipVel
        .clone()
        .addScaledVector(_toShip, DEBUG_COLLISION_TEST_PROJECTILE_SPEED + Math.random() * 15),
      ageSec: 0,
      targetId: target?.id ?? 'default-aim',
      nextVentAtMs: 0,
    };

    registerCollidable({
      id,
      label: 'Debug Collision Test Projectile',
      getWorldPosition: (target) => target.copy(projectile.position),
      getWorldVelocity: (target) => target.copy(projectile.velocity),
      shape: { type: 'sphere', radius: PROJECTILE_RADIUS },
      applyImpulse: (impulse) => {
        projectile.velocity.addScaledVector(impulse, PROJECTILE_IMPULSE_SCALE);
      },
      physicalCollision: true,
    });

    projectilesRef.current.push(projectile);
  }, [findCollisionTarget]);

  const collideProjectileWithTarget = useCallback(
    (projectile: TestProjectile, target: CollidableEntry) => {
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
      projectile.velocity.addScaledVector(_collisionNormal, -normalSpeed * (1 + PROJECTILE_RESTITUTION));
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
  },
  [preferredTargetId]
  );

  useEffect(() => {
    if (!enabled) return;

    const setMode = (nextActive: boolean) => {
      setTestModeActive(nextActive);
      if (!nextActive) clearProjectiles();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === TOGGLE_KEY) {
        toggleTestMode();
        return;
      }
      if (!testModeActiveRef.current) return;

      if (event.code === FIRE_KEY) {
        spawnProjectile();
      } else if (event.code === BURST_KEY) {
        for (let i = 0; i < BURST_COUNT; i++) {
          spawnProjectile();
        }
      }
    };

    const onToggleEvent = () => toggleTestMode();
    const onSetModeEvent = (event: Event) => {
      const next = (event as CustomEvent<{ active?: boolean }>).detail?.active;
      if (typeof next !== 'boolean') return;
      setMode(next);
    };
    const onFireEvent = () => {
      if (!testModeActiveRef.current) setMode(true);
      spawnProjectile();
    };
    const onBurstEvent = () => {
      if (!testModeActiveRef.current) setMode(true);
      for (let i = 0; i < BURST_COUNT; i++) spawnProjectile();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(EVENT_COLLISION_TEST_TOGGLE, onToggleEvent);
    window.addEventListener(EVENT_COLLISION_TEST_SET_MODE, onSetModeEvent);
    window.addEventListener(EVENT_COLLISION_TEST_FIRE, onFireEvent);
    window.addEventListener(EVENT_COLLISION_TEST_BURST, onBurstEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(EVENT_COLLISION_TEST_TOGGLE, onToggleEvent);
      window.removeEventListener(EVENT_COLLISION_TEST_SET_MODE, onSetModeEvent);
      window.removeEventListener(EVENT_COLLISION_TEST_FIRE, onFireEvent);
      window.removeEventListener(EVENT_COLLISION_TEST_BURST, onBurstEvent);
      clearProjectiles();
    };
  }, [clearProjectiles, enabled, spawnProjectile, toggleTestMode]);

  useFrame((_, deltaSec) => {
    if (!enabled || !testModeActiveRef.current) {
      if (meshRef.current) meshRef.current.count = 0;
      return;
    }

    const projectiles = projectilesRef.current;
    let write = 0;
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i];
      projectile.ageSec += deltaSec;
      if (projectile.ageSec > PROJECTILE_LIFETIME_SEC) {
        unregisterCollidable(projectile.id);
        continue;
      }
      projectile.position.addScaledVector(projectile.velocity, deltaSec);
      const target =
        getCollidables().find((entry) => entry.id === projectile.targetId) ?? findCollisionTarget();
      if (target) {
        collideProjectileWithTarget(projectile, target);
      }
      projectiles[write++] = projectile;
    }
    projectiles.length = write;

    if (!meshRef.current) return;
    const visibleCount = Math.min(projectiles.length, MAX_PROJECTILES);
    meshRef.current.count = visibleCount;
    for (let i = 0; i < visibleCount; i++) {
      _dummy.position.copy(projectiles[i].position);
      _dummy.quaternion.identity();
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PROJECTILES]} frustumCulled={false}>
        <sphereGeometry args={[PROJECTILE_RADIUS, 10, 8]} />
        <meshStandardMaterial
          color="#ff3355"
          emissive="#440000"
          emissiveIntensity={0.7}
          metalness={0.2}
          roughness={0.5}
        />
      </instancedMesh>
      {showPanel ? (
        <Html fullscreen zIndexRange={[12000, 12000]}>
          <div style={panelStyle}>
            <div>Collision Test {testModeActive ? 'ON' : 'OFF'} (F8)</div>
            <div style={buttonRowStyle}>
              <button type="button" style={buttonStyle} onClick={toggleTestMode}>
                {testModeActive ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, opacity: testModeActive ? 1 : 0.5 }}
                onClick={() => spawnProjectile()}
                disabled={!testModeActive}
              >
                Fire (J)
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, opacity: testModeActive ? 1 : 0.5 }}
                onClick={() => {
                  for (let i = 0; i < BURST_COUNT; i++) spawnProjectile();
                }}
                disabled={!testModeActive}
              >
                Burst (K)
              </button>
            </div>
          </div>
        </Html>
      ) : null}
    </>
  );
}
