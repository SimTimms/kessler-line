import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../../context/SolarSystemMinimap';
import { shipPosRef } from '../../../context/ShipPos';
import { PLANETS, SOLAR_SYSTEM_SCALE } from '../SolarSystem';

const COUNT = 1400;
const ORBIT_SPEED = 0.22;
const EXPLOSION_COUNT = 24;
const EXPLOSION_MIN_INTERVAL = 0.25;
const EXPLOSION_MAX_INTERVAL = 0.8;
const EXPLOSION_MIN_DURATION = 0.25;
const EXPLOSION_MAX_DURATION = 0.6;
const EXPLOSION_INTENSITY = 6.0;
const EXPLOSION_BASE_MIN = 18;
const EXPLOSION_BASE_MAX = 45;
const IMPACT_COUNT = 80;
const IMPACT_MIN_INTERVAL = 0.05;
const IMPACT_MAX_INTERVAL = 0.2;
const IMPACT_MIN_DURATION = 0.15;
const IMPACT_MAX_DURATION = 0.35;
const IMPACT_INTENSITY = 4.0;
const IMPACT_MIN_RADIUS = 35;
const IMPACT_MAX_RADIUS = 90;

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

interface AsteroidInstance {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  color: THREE.Color;
}

interface ExplosionInstance {
  position: THREE.Vector3;
  baseSize: number;
  startTime: number;
  duration: number;
  nextTime: number;
  color: THREE.Color;
}

interface ImpactInstance {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  nextTime: number;
  color: THREE.Color;
}

export default function EarthAsteroidRing() {
  const ringRef = useRef<THREE.Group>(null!);
  const chaosRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const chaosMeshRef = useRef<THREE.InstancedMesh>(null!);
  const rngRef = useRef(mulberry32(62191));
  const explosionPositionsRef = useRef<Float32Array>(new Float32Array(EXPLOSION_COUNT * 3));
  const explosionColorsRef = useRef<Float32Array>(new Float32Array(EXPLOSION_COUNT * 3));
  const explosionPositionAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const explosionColorAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const impactPositionsRef = useRef<Float32Array>(new Float32Array(IMPACT_COUNT * 3));
  const impactColorsRef = useRef<Float32Array>(new Float32Array(IMPACT_COUNT * 3));
  const impactPositionAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const impactColorAttrRef = useRef<THREE.BufferAttribute | null>(null);

  const earth = PLANETS.find((planet) => planet.name === 'Earth');
  const earthWorldRadius = (earth?.radius ?? 92) * SOLAR_SYSTEM_SCALE;
  const innerRadius = earthWorldRadius * 3.2;
  const outerRadius = earthWorldRadius * 5.2;
  const ringYOffset = earthWorldRadius * 0;

  const asteroidData = useMemo<{
    main: AsteroidInstance[];
    chaos: AsteroidInstance[];
  }>(() => {
    const rng = mulberry32(28411);
    const main: AsteroidInstance[] = [];
    const chaos: AsteroidInstance[] = [];

    for (let i = 0; i < COUNT; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const radius = innerRadius + rng() * (outerRadius - innerRadius);
      const sinPhi = Math.sin(phi);
      const position = new THREE.Vector3(
        Math.cos(theta) * sinPhi * radius,
        Math.cos(phi) * radius,
        Math.sin(theta) * sinPhi * radius
      );

      const size = 2 + rng() * 6;
      const scale = new THREE.Vector3(
        size * (0.4 + rng() * 0.6),
        size * (0.4 + rng() * 0.6),
        size * (0.4 + rng() * 0.6)
      );

      const rotation = new THREE.Euler(
        rng() * Math.PI * 2,
        rng() * Math.PI * 2,
        rng() * Math.PI * 2
      );

      const rotSpeed = new THREE.Vector3(
        (rng() - 0.5) * 0.01,
        (rng() - 0.5) * 0.01,
        (rng() - 0.5) * 0.01
      );

      const colorType = Math.floor(rng() * 3);
      let color: THREE.Color;
      if (colorType === 0) {
        color = new THREE.Color().setHSL(0.08, 0.18 + rng() * 0.18, 0.26 + rng() * 0.2);
      } else if (colorType === 1) {
        color = new THREE.Color().setHSL(0.56, 0.05 + rng() * 0.08, 0.2 + rng() * 0.22);
      } else {
        color = new THREE.Color().setHSL(0.03, 0.28 + rng() * 0.2, 0.2 + rng() * 0.2);
      }

      if (i % 3 === 0) chaos.push({ position, scale, rotation, rotSpeed, color });
      else main.push({ position, scale, rotation, rotSpeed, color });
    }

    return { main, chaos };
  }, [innerRadius, outerRadius]);

  const explosionData = useMemo<ExplosionInstance[]>(() => {
    const rng = mulberry32(90177);
    const data: ExplosionInstance[] = [];

    for (let i = 0; i < EXPLOSION_COUNT; i++) {
      const isWhite = rng() < 0.35;
      data.push({
        position: new THREE.Vector3(),
        baseSize: 6 + rng() * 10,
        startTime: -1,
        duration:
          EXPLOSION_MIN_DURATION + rng() * (EXPLOSION_MAX_DURATION - EXPLOSION_MIN_DURATION),
        nextTime: 0,
        color: isWhite ? new THREE.Color(1.0, 1.0, 1.0) : new THREE.Color(1.0, 0.35, 0.25),
      });
    }

    return data;
  }, []);

  const impactData = useMemo<ImpactInstance[]>(() => {
    const rng = mulberry32(44117);
    const data: ImpactInstance[] = [];

    for (let i = 0; i < IMPACT_COUNT; i++) {
      const isWhite = rng() < 0.45;
      data.push({
        position: new THREE.Vector3(),
        startTime: -1,
        duration: IMPACT_MIN_DURATION + rng() * (IMPACT_MAX_DURATION - IMPACT_MIN_DURATION),
        nextTime: 0,
        color: isWhite ? new THREE.Color(1.0, 1.0, 1.0) : new THREE.Color(1.0, 0.6, 0.25),
      });
    }

    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      asteroidData.main.forEach((data, i) => {
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, data.color);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
    if (chaosMeshRef.current) {
      asteroidData.chaos.forEach((data, i) => {
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        chaosMeshRef.current.setMatrixAt(i, dummy.matrix);
        chaosMeshRef.current.setColorAt(i, data.color);
      });
      chaosMeshRef.current.instanceMatrix.needsUpdate = true;
      if (chaosMeshRef.current.instanceColor) chaosMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [asteroidData, dummy]);

  useEffect(() => {
    const positions = explosionPositionsRef.current;
    const colors = explosionColorsRef.current;
    for (let i = 0; i < EXPLOSION_COUNT; i++) {
      const base = i * 3;
      positions[base + 0] = 0;
      positions[base + 1] = 0;
      positions[base + 2] = 0;
      colors[base + 0] = 0;
      colors[base + 1] = 0;
      colors[base + 2] = 0;
    }
  }, []);

  useEffect(() => {
    const positions = impactPositionsRef.current;
    const colors = impactColorsRef.current;
    for (let i = 0; i < IMPACT_COUNT; i++) {
      const base = i * 3;
      positions[base + 0] = 0;
      positions[base + 1] = 0;
      positions[base + 2] = 0;
      colors[base + 0] = 0;
      colors[base + 1] = 0;
      colors[base + 2] = 0;
    }
  }, []);

  useFrame(({ clock }, delta) => {
    const earthPos = solarPlanetPositions.Earth;
    if (earthPos) {
      const x = earthPos.x * SOLAR_SYSTEM_SCALE;
      const z = earthPos.z * SOLAR_SYSTEM_SCALE;
      if (ringRef.current) {
        ringRef.current.position.set(x, ringYOffset, z);
        ringRef.current.rotation.y += ORBIT_SPEED * delta;
      }
      if (chaosRef.current) {
        chaosRef.current.position.set(x, ringYOffset, z);
        chaosRef.current.rotation.y -= ORBIT_SPEED * delta * 0.9;
        chaosRef.current.rotation.x += ORBIT_SPEED * delta * 0.45;
        chaosRef.current.rotation.z -= ORBIT_SPEED * delta * 0.35;
      }
    }

    if (meshRef.current) {
      asteroidData.main.forEach((data, i) => {
        data.rotation.x += data.rotSpeed.x;
        data.rotation.y += data.rotSpeed.y;
        data.rotation.z += data.rotSpeed.z;
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (chaosMeshRef.current) {
      asteroidData.chaos.forEach((data, i) => {
        data.rotation.x += data.rotSpeed.x * 1.4;
        data.rotation.y += data.rotSpeed.y * 1.4;
        data.rotation.z += data.rotSpeed.z * 1.4;
        dummy.position.copy(data.position);
        dummy.scale.copy(data.scale);
        dummy.rotation.copy(data.rotation);
        dummy.updateMatrix();
        chaosMeshRef.current.setMatrixAt(i, dummy.matrix);
      });
      chaosMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    const explosionPositions = explosionPositionsRef.current;
    const explosionColors = explosionColorsRef.current;
    const now = clock.getElapsedTime();
    const rng = rngRef.current;
    const ringSpan = outerRadius - innerRadius;
    explosionData.forEach((data, i) => {
      if (data.startTime < 0 || now >= data.nextTime) {
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(2 * rng() - 1);
        const radius = innerRadius + rng() * ringSpan;
        const sinPhi = Math.sin(phi);
        data.position.set(
          Math.cos(theta) * sinPhi * radius,
          Math.cos(phi) * radius,
          Math.sin(theta) * sinPhi * radius
        );
        data.baseSize = EXPLOSION_BASE_MIN + rng() * (EXPLOSION_BASE_MAX - EXPLOSION_BASE_MIN);
        data.duration =
          EXPLOSION_MIN_DURATION + rng() * (EXPLOSION_MAX_DURATION - EXPLOSION_MIN_DURATION);
        data.startTime = now;
        data.nextTime =
          now + EXPLOSION_MIN_INTERVAL + rng() * (EXPLOSION_MAX_INTERVAL - EXPLOSION_MIN_INTERVAL);
      }

      const age = now - data.startTime;
      const base = i * 3;
      if (age < 0 || age > data.duration) {
        explosionPositions[base + 0] = data.position.x;
        explosionPositions[base + 1] = data.position.y;
        explosionPositions[base + 2] = data.position.z;
        explosionColors[base + 0] = 0;
        explosionColors[base + 1] = 0;
        explosionColors[base + 2] = 0;
        return;
      }

      const t = age / data.duration;
      const intensity = Math.max(0, 1.0 - t) * EXPLOSION_INTENSITY;
      explosionPositions[base + 0] = data.position.x;
      explosionPositions[base + 1] = data.position.y;
      explosionPositions[base + 2] = data.position.z;
      explosionColors[base + 0] = data.color.r * intensity;
      explosionColors[base + 1] = data.color.g * intensity;
      explosionColors[base + 2] = data.color.b * intensity;
    });

    if (explosionPositionAttrRef.current) explosionPositionAttrRef.current.needsUpdate = true;
    if (explosionColorAttrRef.current) explosionColorAttrRef.current.needsUpdate = true;

    const impactPositions = impactPositionsRef.current;
    const impactColors = impactColorsRef.current;
    const shipPos = shipPosRef.current;

    impactData.forEach((data, i) => {
      if (data.startTime < 0 || now >= data.nextTime) {
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(2 * rng() - 1);
        const radius = IMPACT_MIN_RADIUS + rng() * (IMPACT_MAX_RADIUS - IMPACT_MIN_RADIUS);
        const sinPhi = Math.sin(phi);
        data.position.set(
          shipPos.x + Math.cos(theta) * sinPhi * radius,
          shipPos.y + Math.cos(phi) * radius,
          shipPos.z + Math.sin(theta) * sinPhi * radius
        );
        data.duration = IMPACT_MIN_DURATION + rng() * (IMPACT_MAX_DURATION - IMPACT_MIN_DURATION);
        data.startTime = now;
        data.nextTime =
          now + IMPACT_MIN_INTERVAL + rng() * (IMPACT_MAX_INTERVAL - IMPACT_MIN_INTERVAL);
      }

      const age = now - data.startTime;
      const base = i * 3;
      if (age < 0 || age > data.duration) {
        impactPositions[base + 0] = data.position.x;
        impactPositions[base + 1] = data.position.y;
        impactPositions[base + 2] = data.position.z;
        impactColors[base + 0] = 0;
        impactColors[base + 1] = 0;
        impactColors[base + 2] = 0;
        return;
      }

      const t = age / data.duration;
      const intensity = Math.max(0, 1.0 - t) * IMPACT_INTENSITY;
      impactPositions[base + 0] = data.position.x;
      impactPositions[base + 1] = data.position.y;
      impactPositions[base + 2] = data.position.z;
      impactColors[base + 0] = data.color.r * intensity;
      impactColors[base + 1] = data.color.g * intensity;
      impactColors[base + 2] = data.color.b * intensity;
    });

    if (impactPositionAttrRef.current) impactPositionAttrRef.current.needsUpdate = true;
    if (impactColorAttrRef.current) impactColorAttrRef.current.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.9,
        metalness: 0.15,
      }),
    []
  );

  const explosionTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.6, 'rgba(255,160,80,0.65)');
    gradient.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <>
      <group ref={ringRef}>
        <instancedMesh ref={meshRef} args={[geometry, material, asteroidData.main.length]} />
      </group>
      <group ref={chaosRef}>
        <instancedMesh ref={chaosMeshRef} args={[geometry, material, asteroidData.chaos.length]} />
      </group>
      <group ref={ringRef}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[explosionPositionsRef.current, 3]}
              ref={(attr) => {
                explosionPositionAttrRef.current = attr as THREE.BufferAttribute | null;
              }}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[explosionColorsRef.current, 3]}
              ref={(attr) => {
                explosionColorAttrRef.current = attr as THREE.BufferAttribute | null;
              }}
            />
          </bufferGeometry>
          <pointsMaterial
            size={8}
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            vertexColors
            blending={THREE.AdditiveBlending}
            map={explosionTexture}
            alphaTest={0.05}
          />
        </points>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[impactPositionsRef.current, 3]}
              ref={(attr) => {
                impactPositionAttrRef.current = attr as THREE.BufferAttribute | null;
              }}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[impactColorsRef.current, 3]}
              ref={(attr) => {
                impactColorAttrRef.current = attr as THREE.BufferAttribute | null;
              }}
            />
          </bufferGeometry>
          <pointsMaterial
            size={4}
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            vertexColors
            blending={THREE.AdditiveBlending}
            map={explosionTexture}
            alphaTest={0.05}
          />
        </points>
      </group>
    </>
  );
}
