import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipVelocity } from '../../context/ShipState';
import { shipPosRef } from '../../context/ShipPos';

const CHUNK_COUNT = 140;
const DURATION = 5.0;
const DRAG = 0.94;
const COLOR_RED = new THREE.Color(1, 0, 0);
const COLOR_ORANGE = new THREE.Color(1, 0.5, 0);
const COLOR_BLACK = new THREE.Color(0, 0, 0);

export default function ShipBreakApart({
  shipGroupRef,
}: {
  shipGroupRef?: { current: THREE.Group | null };
}) {
  const activeRef = useRef(false);
  const timeRef = useRef(0);
  const originRef = useRef(new THREE.Vector3());
  const positionsRef = useRef<Float32Array>(new Float32Array(CHUNK_COUNT * 3));
  const velocitiesRef = useRef<Float32Array>(new Float32Array(CHUNK_COUNT * 3));
  const scalesRef = useRef<Float32Array>(new Float32Array(CHUNK_COUNT));
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const colorRef = useRef(new THREE.Color());

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    const onDestroyed = () => {
      const shipVel = shipVelocity.clone();
      const group = shipGroupRef?.current;
      if (group) {
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        originRef.current.copy(center);

        for (let i = 0; i < CHUNK_COUNT; i++) {
          const base = i * 3;
          positionsRef.current[base + 0] = center.x + (Math.random() - 0.5) * size.x;
          positionsRef.current[base + 1] = center.y + (Math.random() - 0.5) * size.y;
          positionsRef.current[base + 2] = center.z + (Math.random() - 0.5) * size.z;

          const speed = 4 + Math.random() * 14;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          velocitiesRef.current[base + 0] = Math.sin(phi) * Math.cos(theta) * speed + shipVel.x;
          velocitiesRef.current[base + 1] = Math.sin(phi) * Math.sin(theta) * speed + shipVel.y;
          velocitiesRef.current[base + 2] = Math.cos(phi) * speed + shipVel.z;

          scalesRef.current[i] = 0.4 + Math.random() * 1.2;
        }
      } else {
        originRef.current.copy(shipPosRef.current);
        for (let i = 0; i < CHUNK_COUNT; i++) {
          const base = i * 3;
          positionsRef.current[base + 0] = originRef.current.x;
          positionsRef.current[base + 1] = originRef.current.y;
          positionsRef.current[base + 2] = originRef.current.z;
          const speed = 4 + Math.random() * 14;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          velocitiesRef.current[base + 0] = Math.sin(phi) * Math.cos(theta) * speed + shipVel.x;
          velocitiesRef.current[base + 1] = Math.sin(phi) * Math.sin(theta) * speed + shipVel.y;
          velocitiesRef.current[base + 2] = Math.cos(phi) * speed + shipVel.z;
          scalesRef.current[i] = 0.4 + Math.random() * 1.2;
        }
      }

      timeRef.current = 0;
      activeRef.current = true;
      if (meshRef.current) meshRef.current.visible = true;
    };

    window.addEventListener('ShipDestroyed', onDestroyed);
    return () => window.removeEventListener('ShipDestroyed', onDestroyed);
  }, [shipGroupRef]);

  useFrame((_, delta) => {
    if (!activeRef.current || !meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    if (t > DURATION) {
      activeRef.current = false;
      meshRef.current.visible = false;
      return;
    }

    const pos = positionsRef.current;
    const vel = velocitiesRef.current;
    const scales = scalesRef.current;
    const mesh = meshRef.current;
    const temp = new THREE.Object3D();
    const progress = Math.min(1, t / DURATION);
    const material = mesh.material as THREE.MeshBasicMaterial;
    const color = colorRef.current;

    if (progress < 0.5) {
      color.copy(COLOR_RED).lerp(COLOR_ORANGE, progress * 2);
    } else {
      color.copy(COLOR_ORANGE).lerp(COLOR_BLACK, (progress - 0.5) * 2);
    }
    material.color.copy(color);

    for (let i = 0; i < CHUNK_COUNT; i++) {
      const base = i * 3;
      pos[base + 0] += vel[base + 0] * delta;
      pos[base + 1] += vel[base + 1] * delta;
      pos[base + 2] += vel[base + 2] * delta;

      vel[base + 0] *= DRAG;
      vel[base + 1] *= DRAG;
      vel[base + 2] *= DRAG;

      temp.position.set(pos[base + 0], pos[base + 1], pos[base + 2]);
      temp.rotation.set(0, 0, 0);
      temp.scale.setScalar(scales[i]);
      temp.updateMatrix();
      mesh.setMatrixAt(i, temp.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    material.opacity = Math.max(0, 1 - t / DURATION);
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, CHUNK_COUNT]} visible={false} />;
}
