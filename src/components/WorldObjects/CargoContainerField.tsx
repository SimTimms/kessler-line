import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';
import {
  selectTarget,
  selectedTargetKey,
  selectedTargetVelocity,
  selectedTargetPosition,
  flashTarget,
} from '../../context/TargetSelection';
import { shipPosRef } from '../../context/ShipPos';
import {
  CONTAINER_COUNT,
  CONTAINER_SPAWN_RADIUS_MIN,
  CONTAINER_SPAWN_RADIUS_MAX,
  CONTAINER_SPAWN_Y_SPREAD,
  CONTAINER_SCALE,
  CONTAINER_IMPULSE_SCALE,
  CONTAINER_VELOCITY_DAMPING,
  CONTAINER_CAPTURE_SPEED,
  CONTAINER_RELEASE_IMPULSE,
  CONTAINER_DOCK_OFFSET_X,
  CONTAINER_DOCK_OFFSET_Y,
  CONTAINER_DOCK_OFFSET_Z,
} from '../../config/containerConfig';
import {
  shipVelocity,
  shipQuaternion,
  DOCKING_PORT_LOCAL_Z,
  DOCKING_PORT_RADIUS,
} from '../../context/ShipState';
import { PLANETS } from '../Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { START_PLANET, START_DISTANCE_FROM_PLANET } from '../../config/spawnConfig';

// Seeded pseudo-random — same pattern used by SpaceDebris
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ContainerEntry {
  id: string;
  initPosition: THREE.Vector3;
  initQuaternion: THREE.Quaternion;
}

/** Replicates the pure position calculation from useShipInit (no hooks). */
function computeShipDefaultStart(): THREE.Vector3 {
  const planet = PLANETS.find((p) => p.name === START_PLANET);
  const planetX = planet
    ? Math.cos(planet.initialAngle) * planet.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const planetZ = planet
    ? -Math.sin(planet.initialAngle) * planet.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  return new THREE.Vector3(planetX + START_DISTANCE_FROM_PLANET, 0, planetZ);
}

function generateContainerEntries(): ContainerEntry[] {
  const rng = mulberry32(6182);
  const entries: ContainerEntry[] = [];
  for (let i = 0; i < CONTAINER_COUNT; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const dist =
      CONTAINER_SPAWN_RADIUS_MIN +
      rng() * (CONTAINER_SPAWN_RADIUS_MAX - CONTAINER_SPAWN_RADIUS_MIN);
    const x = dist * Math.sin(phi) * Math.cos(theta);
    const y = (rng() - 0.5) * 2 * CONTAINER_SPAWN_Y_SPREAD;
    const z = dist * Math.sin(phi) * Math.sin(theta);
    const euler = new THREE.Euler(
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
    );
    entries.push({
      id: `cargo-container-${i}`,
      initPosition: new THREE.Vector3(x, y, z),
      initQuaternion: new THREE.Quaternion().setFromEuler(euler),
    });
  }

  // Entry 0: always 3000 units directly ahead of the ship's default start position.
  const shipStart = computeShipDefaultStart();
  entries[0].initPosition.set(shipStart.x - 3000, 0, shipStart.z);
  entries[0].initQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.25, Math.PI * 0.1));

  return entries;
}

const CONTAINER_ENTRIES: ContainerEntry[] = generateContainerEntries();

// Module-level scratch vectors — safe because useFrame runs synchronously
const _portPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();

// ── Per-container instance ────────────────────────────────────────────────────

interface ContainerInstanceProps {
  entry: ContainerEntry;
  scene: THREE.Group;
  halfExtents: THREE.Vector3;
}

function ContainerInstance({ entry, scene, halfExtents }: ContainerInstanceProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const posRef = useRef(entry.initPosition.clone());
  const velRef = useRef(new THREE.Vector3());
  const quatRef = useRef(entry.initQuaternion.clone());
  const capturedRef = useRef(false);
  const releaseCooldownUntil = useRef(0); // performance.now() timestamp; recapture blocked until then

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Register collision and magnetic always — no proximity gate.
  // 25 box checks per frame is negligible.
  // Also listen for CargoRelease (spacebar while undocked) to drop the container.
  useEffect(() => {
    registerCollidable({
      id: entry.id,
      getWorldPosition: (target) => target.copy(posRef.current),
      getWorldQuaternion: (target) => target.copy(quatRef.current),
      shape: { type: 'box', halfExtents },
      // Skip impulse while captured — container moves with ship, not physics
      applyImpulse: (impulse: THREE.Vector3) => {
        if (!capturedRef.current) {
          velRef.current.addScaledVector(impulse, CONTAINER_IMPULSE_SCALE);
        }
      },
    });
    registerMagnetic({
      id: entry.id,
      label: 'Cargo Container',
      getPosition: (target) => target.copy(posRef.current),
    });

    const onRelease = () => {
      if (!capturedRef.current) return;
      capturedRef.current = false;
      releaseCooldownUntil.current = performance.now() + 3000; // block recapture for 3 s
      // Inherit ship velocity + small forward kick so it doesn't snap back
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(shipQuaternion);
      velRef.current.copy(shipVelocity).addScaledVector(forward, CONTAINER_RELEASE_IMPULSE);
      window.dispatchEvent(new CustomEvent('CargoReleased', { detail: { id: entry.id } }));
    };
    window.addEventListener('CargoRelease', onRelease);

    return () => {
      unregisterCollidable(entry.id);
      unregisterMagnetic(entry.id);
      window.removeEventListener('CargoRelease', onRelease);
    };
  // halfExtents is a stable useMemo ref — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  useFrame((_, delta) => {
    // ── Captured: follow docking port each frame ─────────────────────────────
    if (capturedRef.current) {
      _portPos
        .set(
          CONTAINER_DOCK_OFFSET_X,
          CONTAINER_DOCK_OFFSET_Y,
          DOCKING_PORT_LOCAL_Z + CONTAINER_DOCK_OFFSET_Z,
        )
        .applyQuaternion(shipQuaternion)
        .add(shipPosRef.current);
      posRef.current.copy(_portPos);
      groupRef.current.position.copy(_portPos);
      groupRef.current.quaternion.copy(shipQuaternion);
      return;
    }

    // ── Keep target velocity + position in sync ───────────────────────────────
    if (selectedTargetKey === entry.id) {
      selectedTargetVelocity.copy(velRef.current);
      selectedTargetPosition.copy(posRef.current);
    }

    // ── Velocity integration (only runs when container is moving) ────────────
    if (velRef.current.lengthSq() > 1e-6) {
      posRef.current.addScaledVector(velRef.current, delta);
      velRef.current.multiplyScalar(Math.pow(CONTAINER_VELOCITY_DAMPING, delta));
      groupRef.current.position.copy(posRef.current);
    }

    // ── Docking-port capture check ───────────────────────────────────────────
    _portPos
      .set(0, 0, DOCKING_PORT_LOCAL_Z)
      .applyQuaternion(shipQuaternion)
      .add(shipPosRef.current);

    if (performance.now() > releaseCooldownUntil.current) {
      const captureRange = halfExtents.length() + DOCKING_PORT_RADIUS;
      if (_portPos.distanceTo(posRef.current) < captureRange) {
        const relSpeed = _relVel.copy(shipVelocity).sub(velRef.current).length();
        if (relSpeed < CONTAINER_CAPTURE_SPEED) {
          capturedRef.current = true;
          velRef.current.set(0, 0, 0);
          window.dispatchEvent(new CustomEvent('CargoContained', { detail: { id: entry.id } }));
        }
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={entry.initPosition}
      quaternion={entry.initQuaternion}
      scale={CONTAINER_SCALE}
      onClick={(e) => {
        e.stopPropagation();
        selectTarget('Cargo Container', velRef.current, posRef.current, entry.id, 'magnetic');
        flashTarget();
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// ── Field component ───────────────────────────────────────────────────────────

export default function CargoContainerField() {
  const { scene } = useGLTF('/container.glb') as { scene: THREE.Group };

  // Derive collision half-extents from the loaded model's actual bounding box.
  const halfExtents = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    size.multiplyScalar(CONTAINER_SCALE * 0.5);
    return size;
  }, [scene]);

  return (
    <>
      {CONTAINER_ENTRIES.map((entry) => (
        <ContainerInstance key={entry.id} entry={entry} scene={scene} halfExtents={halfExtents} />
      ))}
    </>
  );
}

useGLTF.preload('/container.glb');
