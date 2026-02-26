import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_PARTICLES = 200;
const BURST_COUNT   = 180; // particles emitted in one burst
const BASE_SPEED    = 5;   // world units/second (jittered)
const BASE_LIFETIME = 1.2; // seconds (jittered ±30%)

type Particle = {
  active: boolean;
  age: number; maxAge: number;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
};

interface DockingReleaseParticlesProps {
  shipGroupRef: { current: THREE.Group | null };
  triggerRef:   { current: boolean };
}

export default function DockingReleaseParticles({
  shipGroupRef,
  triggerRef,
}: DockingReleaseParticlesProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null!);

  const positions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const colors    = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

  const pool     = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, age: 0, maxAge: 0,
      px: 0, py: 0, pz: 0,
      vx: 0, vy: 0, vz: 0,
    }))
  );
  const nextSlot = useRef(0);

  function spawnBurst() {
    const ship = shipGroupRef.current;
    if (!ship) return;

    const origin = new THREE.Vector3();
    ship.getWorldPosition(origin);

    for (let i = 0; i < BURST_COUNT; i++) {
      // Uniform random direction on a sphere (Marsaglia method)
      let dx, dy, dz, lenSq;
      do {
        dx = Math.random() * 2 - 1;
        dy = Math.random() * 2 - 1;
        dz = Math.random() * 2 - 1;
        lenSq = dx * dx + dy * dy + dz * dz;
      } while (lenSq > 1 || lenSq < 0.0001);
      const invLen = 1 / Math.sqrt(lenSq);
      dx *= invLen; dy *= invLen; dz *= invLen;

      const speed    = BASE_SPEED    * (0.5 + Math.random() * 1.0);
      const lifetime = BASE_LIFETIME * (0.7 + Math.random() * 0.6);

      const idx = nextSlot.current;
      nextSlot.current = (idx + 1) % MAX_PARTICLES;

      const p = pool.current[idx];
      p.active = true;
      p.age    = 0;
      p.maxAge = lifetime;
      p.px = origin.x; p.py = origin.y; p.pz = origin.z;
      p.vx = dx * speed;
      p.vy = dy * speed;
      p.vz = dz * speed;
    }
  }

  useFrame((_, delta) => {
    if (triggerRef.current) {
      triggerRef.current = false;
      spawnBurst();
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool.current[i];

      if (!p.active) {
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0;
        continue;
      }

      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0;
        continue;
      }

      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;
      positions[i * 3]     = p.px;
      positions[i * 3 + 1] = p.py;
      positions[i * 3 + 2] = p.pz;

      // White, fading to transparent (additive blending makes black = invisible)
      const t          = p.age / p.maxAge;
      const brightness = Math.pow(1 - t, 1.5) * 0.7; // starts at 0.7, fades out
      colors[i * 3]     = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    if (!geoRef.current) return;
    (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRef.current.attributes.color    as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
