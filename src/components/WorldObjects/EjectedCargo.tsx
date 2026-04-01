import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { consumeEject } from '../../context/EjectEvent';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipVelocity, shipQuaternion } from '../Ship/Spaceship';

const MAX_CUBES = 200;
const CUBE_LIFETIME = 60; // seconds before despawn
const EJECT_SPEED = 3; // m/s backward impulse relative to ship
const SPREAD = 1.5; // m/s random spread per axis

interface PhysicsCube {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  rotation: number;
  age: number;
}

const _dummy = new THREE.Object3D();
const _forward = new THREE.Vector3();
const _rearBase = new THREE.Vector3();

export default function EjectedCargo() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const cubesRef = useRef<PhysicsCube[]>([]);

  const geometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c8922a',
        roughness: 0.6,
        metalness: 0.3,
        emissive: new THREE.Color('#3a1a00'),
        emissiveIntensity: 0.4,
      }),
    []
  );

  useFrame((_, delta) => {
    const spawnCount = consumeEject();

    if (spawnCount > 0) {
      // Ship's world-space forward direction
      _forward.set(0, 0, 1).applyQuaternion(shipQuaternion);
      // Spawn point: 12 units behind the ship
      _rearBase.copy(minimapShipPosition).addScaledVector(_forward, -12);

      for (let i = 0; i < spawnCount; i++) {
        if (cubesRef.current.length >= MAX_CUBES) break;

        const pos = new THREE.Vector3(
          _rearBase.x + (Math.random() - 0.5) * 4,
          _rearBase.y + (Math.random() - 0.5) * 4,
          _rearBase.z + (Math.random() - 0.5) * 4
        );

        // Inherit ship velocity, add backward impulse + random spread
        const vel = new THREE.Vector3()
          .copy(shipVelocity)
          .addScaledVector(_forward, -EJECT_SPEED)
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * SPREAD * 2,
              (Math.random() - 0.5) * SPREAD * 2,
              (Math.random() - 0.5) * SPREAD * 2
            )
          );

        cubesRef.current.push({
          position: pos,
          velocity: vel,
          rotAxis: new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize(),
          rotSpeed: Math.random() * 3 + 1,
          rotation: Math.random() * Math.PI * 2,
          age: 0,
        });
      }
    }

    // Physics update — compact array in-place to avoid allocations
    let writeIdx = 0;
    for (let i = 0; i < cubesRef.current.length; i++) {
      const cube = cubesRef.current[i];
      cube.age += delta;
      if (cube.age >= CUBE_LIFETIME) continue;
      cube.position.addScaledVector(cube.velocity, delta);
      cube.rotation += cube.rotSpeed * delta;
      cubesRef.current[writeIdx++] = cube;
    }
    cubesRef.current.length = writeIdx;

    // Update instanced mesh matrices
    if (!meshRef.current) return;
    const n = Math.min(writeIdx, MAX_CUBES);
    meshRef.current.count = n;
    for (let i = 0; i < n; i++) {
      const cube = cubesRef.current[i];
      _dummy.position.copy(cube.position);
      _dummy.setRotationFromAxisAngle(cube.rotAxis, cube.rotation);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_CUBES]} frustumCulled={false} />
  );
}
