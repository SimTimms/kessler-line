import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clearProjectiles } from './clearProjectiles';
import { findCollisionTarget } from './findCollisionTarget';
import { spawnProjectile, PROJECTILE_RADIUS, type TestProjectile } from './spawnProjectile';
import { syncInstancedMesh } from './syncInstancedMesh';
import { tickProjectiles } from './tickProjectiles';
import './CollisionPhysicsTestRig.css';
import { DEBUG_COLLISION_PHYSICS_TESTS } from '../../config/debugConfig';

const MAX_PROJECTILES = 48;
const BURST_COUNT = 5;

export const EVENT_COLLISION_TEST_TOGGLE = 'DebugCollisionTestToggle';
export const EVENT_COLLISION_TEST_SET_MODE = 'DebugCollisionTestSetMode';
export const EVENT_COLLISION_TEST_FIRE = 'DebugCollisionTestFire';
export const EVENT_COLLISION_TEST_BURST = 'DebugCollisionTestBurst';

interface CollisionPhysicsTestRigProps {
  enabled?: boolean;
  showPanel?: boolean;
  defaultAimPosition?: [number, number, number];
  preferredTargetId?: string;
}

export default function CollisionPhysicsTestRig({
  enabled = DEBUG_COLLISION_PHYSICS_TESTS,
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

  const findTarget = useCallback(() => findCollisionTarget(preferredTargetId), [preferredTargetId]);

  const clearAll = useCallback(() => clearProjectiles(projectilesRef.current), []);

  const toggleTestMode = useCallback(() => {
    setTestModeActive((current) => {
      const next = !current;
      if (!next) clearAll();
      return next;
    });
  }, [clearAll]);

  const spawn = useCallback(
    () =>
      spawnProjectile(
        findTarget(),
        defaultAimRef.current,
        projectilesRef.current,
        () => nextProjectileIdRef.current++
      ),
    [findTarget]
  );

  useEffect(() => {
    if (!enabled) return;

    const setMode = (nextActive: boolean) => {
      setTestModeActive(nextActive);
      if (!nextActive) clearAll();
    };

    const onToggleEvent = () => toggleTestMode();
    const onSetModeEvent = (event: Event) => {
      const next = (event as CustomEvent<{ active?: boolean }>).detail?.active;
      if (typeof next !== 'boolean') return;
      setMode(next);
    };
    const onFireEvent = () => {
      if (!testModeActiveRef.current) setMode(true);
      spawn();
    };
    const onBurstEvent = () => {
      if (!testModeActiveRef.current) setMode(true);
      for (let i = 0; i < BURST_COUNT; i++) spawn();
    };

    window.addEventListener(EVENT_COLLISION_TEST_TOGGLE, onToggleEvent);
    window.addEventListener(EVENT_COLLISION_TEST_SET_MODE, onSetModeEvent);
    window.addEventListener(EVENT_COLLISION_TEST_FIRE, onFireEvent);
    window.addEventListener(EVENT_COLLISION_TEST_BURST, onBurstEvent);
    return () => {
      window.removeEventListener(EVENT_COLLISION_TEST_TOGGLE, onToggleEvent);
      window.removeEventListener(EVENT_COLLISION_TEST_SET_MODE, onSetModeEvent);
      window.removeEventListener(EVENT_COLLISION_TEST_FIRE, onFireEvent);
      window.removeEventListener(EVENT_COLLISION_TEST_BURST, onBurstEvent);
      clearAll();
    };
  }, [clearAll, enabled, spawn, toggleTestMode]);

  useFrame((_, deltaSec) => {
    if (!enabled || !testModeActiveRef.current) {
      if (meshRef.current) meshRef.current.count = 0;
      return;
    }

    tickProjectiles(projectilesRef.current, deltaSec, preferredTargetId, findTarget);

    if (meshRef.current) {
      syncInstancedMesh(meshRef.current, projectilesRef.current, MAX_PROJECTILES);
    }
  });

  if (!enabled) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_PROJECTILES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[PROJECTILE_RADIUS, 10, 8]} />
        <meshStandardMaterial color="#ff3355" emissive="#440000" emissiveIntensity={0.7} />
      </instancedMesh>
    </>
  );
}
