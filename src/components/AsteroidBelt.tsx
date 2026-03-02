import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEPTUNE_DEF, RED_PLANET_DEF } from '../config/worldConfig';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';

const COUNT_PER_TYPE = 520; // 360 total across 3 geometry types
const GROUP_Y = 6000; // matches the <group position={[0, 5000, 0]}> offset below
const COLLIDER_Y_MIN = -300;
const COLLIDER_Y_MAX = 300;

// Module-level constants derived from world config
const NEP_POS = new THREE.Vector3(...NEPTUNE_DEF.position);
const RED_POS = new THREE.Vector3(...RED_PLANET_DEF.position);

// Perpendicular basis vectors for the belt plane (computed once)
const _beltDir = new THREE.Vector3().subVectors(RED_POS, NEP_POS).normalize();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _beltPerp1 = new THREE.Vector3()
  .crossVectors(
    _beltDir,
    Math.abs(_beltDir.dot(_worldUp)) > 0.9 ? new THREE.Vector3(1, 0, 0) : _worldUp
  )
  .normalize();
const _beltPerp2 = new THREE.Vector3().crossVectors(_beltDir, _beltPerp1).normalize();

// Seeded pseudo-random (mulberry32)
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

interface AsteroidData {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Euler;
  rotSpeed: THREE.Vector3;
}

export default function AsteroidBelt() {
  const icosRef = useRef<THREE.InstancedMesh>(null!);
  const octaRef = useRef<THREE.InstancedMesh>(null!);
  const dodeRef = useRef<THREE.InstancedMesh>(null!);

  const asteroidData = useMemo<AsteroidData[][]>(() => {
    const rng = mulberry32(7331);
    const result: AsteroidData[][] = [[], [], []];
    const pathLength = NEP_POS.distanceTo(RED_POS);

    for (let typeIdx = 0; typeIdx < 3; typeIdx++) {
      for (let i = 0; i < COUNT_PER_TYPE; i++) {
        // Place along 20%–80% of the Neptune → Red Planet path
        const t = 0.2 + rng() * 0.6;
        const beltCenter = new THREE.Vector3().lerpVectors(NEP_POS, RED_POS, t);

        // Scatter radially in the belt plane (perpendicular to path)
        const angle = rng() * Math.PI * 2;
        const radius = 200 + rng() * 1800; // 600–2400 units from path axis
        const alongAxis = (rng() - 0.5) * pathLength * 0.04; // slight along-axis jitter

        const pos = beltCenter
          .clone()
          .addScaledVector(_beltPerp1, Math.cos(angle) * radius)
          .addScaledVector(_beltPerp2, Math.sin(angle) * radius)
          .addScaledVector(_beltDir, alongAxis);

        // Non-uniform scale for lumpy rock feel
        const size = 10 + rng() * 55;
        const scale = new THREE.Vector3(
          size * (0.5 + rng() * 1.0),
          size * (0.5 + rng() * 1.0),
          size * (0.5 + rng() * 1.0)
        );

        const rotation = new THREE.Euler(
          rng() * Math.PI * 2,
          rng() * Math.PI * 2,
          rng() * Math.PI * 2
        );

        const rotSpeed = new THREE.Vector3(
          (rng() - 0.5) * 0.005,
          (rng() - 0.5) * 0.005,
          (rng() - 0.5) * 0.005
        );

        result[typeIdx].push({ position: pos, scale, rotation, rotSpeed });
      }
    }
    return result;
  }, []);

  // Asteroids whose world Y (pos.y + GROUP_Y) falls in the collidable zone
  const collidableAsteroids = useMemo(() => {
    const result: { id: string; worldPos: THREE.Vector3; radius: number }[] = [];
    asteroidData.forEach((group, typeIdx) => {
      group.forEach((data, i) => {
        const worldY = data.position.y + GROUP_Y;
        if (worldY >= COLLIDER_Y_MIN && worldY <= COLLIDER_Y_MAX) {
          result.push({
            id: `asteroid-${typeIdx}-${i}`,
            worldPos: new THREE.Vector3(data.position.x, worldY, data.position.z),
            radius: Math.max(data.scale.x, data.scale.y, data.scale.z),
          });
        }
      });
    });
    return result;
  }, [asteroidData]);

  useEffect(() => {
    for (const ast of collidableAsteroids) {
      const pos = ast.worldPos;
      registerCollidable({
        id: ast.id,
        getWorldPosition: (target) => target.copy(pos),
        shape: { type: 'sphere', radius: ast.radius },
      });
    }
    return () => {
      for (const ast of collidableAsteroids) {
        unregisterCollidable(ast.id);
      }
    };
  }, [collidableAsteroids]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const refs = [icosRef, octaRef, dodeRef];
    refs.forEach((ref, typeIdx) => {
      if (!ref.current) return;
      asteroidData[typeIdx].forEach((data, i) => {
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [asteroidData, dummy]);

  useFrame(() => {
    const refs = [icosRef, octaRef, dodeRef];
    refs.forEach((ref, typeIdx) => {
      if (!ref.current) return;
      asteroidData[typeIdx].forEach((data, i) => {
        data.rotation.x += data.rotSpeed.x;
        data.rotation.y += data.rotSpeed.y;
        data.rotation.z += data.rotSpeed.z;
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    });
  });

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#7a6a55',
        roughness: 0.92,
        metalness: 0.05,
      }),
    []
  );

  const icosGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const octaGeo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const dodeGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);

  return (
    <group position={[0, GROUP_Y, 0]}>
      <instancedMesh ref={icosRef} args={[icosGeo, material, COUNT_PER_TYPE]} />
      <instancedMesh ref={octaRef} args={[octaGeo, material, COUNT_PER_TYPE]} />
      <instancedMesh ref={dodeRef} args={[dodeGeo, material, COUNT_PER_TYPE]} />
    </group>
  );
}
