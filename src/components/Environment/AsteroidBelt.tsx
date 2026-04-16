import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import {
  ASTEROID_BELT_COLLIDER_Y_MIN as COLLIDER_Y_MIN,
  ASTEROID_BELT_COLLIDER_Y_MAX as COLLIDER_Y_MAX,
  ASTEROID_SIZE_MIN,
  ASTEROID_SIZE_MAX,
} from '../../config/particleConfig';
import { getGraphicsSettings } from '../../context/GraphicsState';

const GROUP_Y = 0; // matches the <group position={[0, 5000, 0]}> offset below

// Belt endpoints authored at SOLAR_SYSTEM_SCALE=4; divide by 4 to get scale-1 base
const S = SOLAR_SYSTEM_SCALE / 4;
const NEP_POS = new THREE.Vector3(6084 * S, 0, -6084 * S);
const RED_POS = new THREE.Vector3(6084 * S, 0, -3084 * S);

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
  color: THREE.Color;
}

export default function AsteroidBelt() {
  // Read quality settings once at mount; HeavyEnvironment remounts on quality change
  const { asteroidBeltCountPerType: COUNT_PER_TYPE, asteroidBeltSkipFrames: SKIP_FRAMES } = useMemo(() => getGraphicsSettings(), []);

  const icosRef = useRef<THREE.InstancedMesh>(null!);
  const octaRef = useRef<THREE.InstancedMesh>(null!);
  const dodeRef = useRef<THREE.InstancedMesh>(null!);
  const frameCountRef = useRef(0);

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
        const radius = (200 + rng() * 1800) * S; // scales with solar system (200–1800 at scale=4)
        const alongAxis = (rng() - 0.5) * pathLength * 0.04; // slight along-axis jitter

        const pos = beltCenter
          .clone()
          .addScaledVector(_beltPerp1, Math.cos(angle) * radius)
          .addScaledVector(_beltPerp2, Math.sin(angle) * radius)
          .addScaledVector(_beltDir, alongAxis);

        // Non-uniform scale for lumpy rock feel
        const size = ASTEROID_SIZE_MIN + rng() * (ASTEROID_SIZE_MAX - ASTEROID_SIZE_MIN);
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

        // Vary colors across brown, cool-grey, and reddish rock tones
        const colorType = Math.floor(rng() * 3);
        let color: THREE.Color;
        if (colorType === 0) {
          color = new THREE.Color().setHSL(0.07, 0.15 + rng() * 0.2, 0.28 + rng() * 0.22); // warm brown
        } else if (colorType === 1) {
          color = new THREE.Color().setHSL(0.55, 0.04 + rng() * 0.08, 0.22 + rng() * 0.28); // cool grey
        } else {
          color = new THREE.Color().setHSL(0.03, 0.25 + rng() * 0.2, 0.22 + rng() * 0.22); // reddish
        }

        result[typeIdx].push({ position: pos, scale, rotation, rotSpeed, color });
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
        ref.current.setColorAt(i, data.color);
      });
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    });
  }, [asteroidData, dummy]);

  useFrame(() => {
    frameCountRef.current++;
    if (SKIP_FRAMES > 0 && frameCountRef.current % (SKIP_FRAMES + 1) !== 0) return;

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

  const craterBumpTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const rng = mulberry32(42);

    // Mid-grey base (no displacement)
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, size, size);

    // Grainy surface noise
    for (let i = 0; i < 6000; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const s = 1 + rng() * 3;
      const v = 100 + Math.floor(rng() * 80);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, s, s);
    }

    return new THREE.CanvasTexture(canvas);
  }, []);

  const craterTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const rng = mulberry32(42);

    // Mid-grey base (no displacement)
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, size, size);

    // Grainy surface noise — reduce iterations on lower quality tiers
    const noiseIterations = COUNT_PER_TYPE <= 80 ? 20000 : COUNT_PER_TYPE <= 250 ? 60000 : 116000;
    for (let i = 0; i < noiseIterations; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const s = 1 + rng() * 3;
      const v = 100 + Math.floor(rng() * 80);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, s, s);
    }

    return new THREE.CanvasTexture(canvas);
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.92,
        metalness: 1.05,
        bumpMap: craterBumpTexture,
        map: craterTexture,
        bumpScale: 1.2,
      }),
    [craterBumpTexture]
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
