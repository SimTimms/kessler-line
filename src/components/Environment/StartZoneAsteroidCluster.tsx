import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 380;
const INNER_RADIUS = 80;
const OUTER_RADIUS = 2400;

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
  color: THREE.Color;
}

const craterBumpTexture = (() => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = mulberry32(55123);
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const s = 1 + rng() * 3;
    const v = 90 + Math.floor(rng() * 90);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, s, s);
  }
  return new THREE.CanvasTexture(canvas);
})();

interface StartZoneAsteroidClusterProps {
  center: [number, number, number];
}

export default function StartZoneAsteroidCluster({ center }: StartZoneAsteroidClusterProps) {
  const icosRef = useRef<THREE.InstancedMesh>(null!);
  const octaRef = useRef<THREE.InstancedMesh>(null!);
  const countEach = Math.ceil(COUNT / 2);

  const asteroidData = useMemo<AsteroidData[][]>(() => {
    const rng = mulberry32(93847);
    const icos: AsteroidData[] = [];
    const octa: AsteroidData[] = [];

    for (let i = 0; i < COUNT; i++) {
      // Spherical distribution biased toward inner region
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const r = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * Math.pow(rng(), 0.7);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.25; // disc-shaped cluster
      const z = r * Math.cos(phi);

      const size = 8 + rng() * 60;
      const scale = new THREE.Vector3(
        size * (0.5 + rng() * 0.9),
        size * (0.5 + rng() * 0.9),
        size * (0.5 + rng() * 0.9)
      );

      const rotation = new THREE.Euler(
        rng() * Math.PI * 2,
        rng() * Math.PI * 2,
        rng() * Math.PI * 2
      );

      const rotSpeed = new THREE.Vector3(
        (rng() - 0.5) * 0.006,
        (rng() - 0.5) * 0.006,
        (rng() - 0.5) * 0.006
      );

      // Slight purple/grey tint to blend with nebula — plus standard rock tones
      const colorType = Math.floor(rng() * 4);
      let color: THREE.Color;
      if (colorType === 0) {
        color = new THREE.Color().setHSL(0.07, 0.12 + rng() * 0.18, 0.28 + rng() * 0.2);
      } else if (colorType === 1) {
        color = new THREE.Color().setHSL(0.55, 0.04 + rng() * 0.07, 0.22 + rng() * 0.25);
      } else if (colorType === 2) {
        color = new THREE.Color().setHSL(0.03, 0.22 + rng() * 0.18, 0.22 + rng() * 0.2);
      } else {
        // Slightly purple-tinted to sit inside the nebula
        color = new THREE.Color().setHSL(0.75, 0.06 + rng() * 0.1, 0.2 + rng() * 0.22);
      }

      const entry: AsteroidData = {
        position: new THREE.Vector3(
          center[0] + x,
          center[1] + y,
          center[2] + z
        ),
        scale,
        rotation,
        rotSpeed,
        color,
      };

      if (i % 2 === 0) icos.push(entry);
      else octa.push(entry);
    }

    return [icos, octa];
  }, [center]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.93,
        metalness: 0.1,
        bumpMap: craterBumpTexture,
        bumpScale: 1.0,
      }),
    []
  );

  useEffect(() => {
    [icosRef, octaRef].forEach((ref, idx) => {
      if (!ref.current) return;
      asteroidData[idx].forEach((data, i) => {
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
        ref.current.setColorAt(i, data.color);
      });
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    });
  }, [asteroidData, dummy]);

  useFrame(() => {
    [icosRef, octaRef].forEach((ref, idx) => {
      if (!ref.current) return;
      asteroidData[idx].forEach((data, i) => {
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

  const icosGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const octaGeo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);

  return (
    <>
      <instancedMesh ref={icosRef} args={[icosGeo, material, countEach]} />
      <instancedMesh ref={octaRef} args={[octaGeo, material, countEach]} />
    </>
  );
}
