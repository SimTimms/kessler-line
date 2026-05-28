import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { randomBellySpawnLocal, randomBellyEjectDirectionLocal } from '../../utils/shipBellyEject';
import {
  VENT_PARTICLE_POOL_SIZE,
  VENT_PARTICLES_PER_UNIT,
  VENT_PARTICLE_BURST_MIN,
  VENT_PARTICLE_BURST_MAX,
  VENT_PARTICLE_BASE_SPEED,
  VENT_PARTICLE_BASE_LIFETIME,
  VENT_PARTICLE_COLOR_FUEL,
  VENT_PARTICLE_COLOR_O2,
} from '../../config/ventParticleConfig';
import { drainVentParticleQueue, type VentParticleKind } from '../../context/ventParticles';

const _localOrigin = new THREE.Vector3();
const _localDir = new THREE.Vector3();
const _worldDir = new THREE.Vector3();

type Particle = {
  active: boolean;
  age: number;
  maxAge: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  cr: number;
  cg: number;
  cb: number;
};

interface ResourceVentParticlesProps {
  shipGroupRef: { current: THREE.Group | null };
}

function burstCountForAmount(amount: number): number {
  return Math.min(
    VENT_PARTICLE_BURST_MAX,
    Math.max(VENT_PARTICLE_BURST_MIN, Math.round(amount * VENT_PARTICLES_PER_UNIT))
  );
}

function tintForKind(kind: VentParticleKind): [number, number, number] {
  return kind === 'fuel' ? VENT_PARTICLE_COLOR_FUEL : VENT_PARTICLE_COLOR_O2;
}

export default function ResourceVentParticles({ shipGroupRef }: ResourceVentParticlesProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null!);

  const positions = useMemo(() => new Float32Array(VENT_PARTICLE_POOL_SIZE * 3), []);
  const colors = useMemo(() => new Float32Array(VENT_PARTICLE_POOL_SIZE * 3), []);

  const pool = useRef<Particle[]>(
    Array.from({ length: VENT_PARTICLE_POOL_SIZE }, () => ({
      active: false,
      age: 0,
      maxAge: 0,
      px: 0,
      py: 0,
      pz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      cr: 0,
      cg: 0,
      cb: 0,
    }))
  );
  const nextSlot = useRef(0);

  function spawnParticle(ship: THREE.Group, tint: [number, number, number]) {
    randomBellySpawnLocal(_localOrigin);
    ship.localToWorld(_localOrigin);

    randomBellyEjectDirectionLocal(_localDir);
    _worldDir.copy(_localDir).applyQuaternion(ship.quaternion);

    const speed = VENT_PARTICLE_BASE_SPEED * (0.55 + Math.random() * 0.9);
    const lifetime = VENT_PARTICLE_BASE_LIFETIME * (0.7 + Math.random() * 0.6);

    const idx = nextSlot.current;
    nextSlot.current = (idx + 1) % VENT_PARTICLE_POOL_SIZE;

    const p = pool.current[idx];
    p.active = true;
    p.age = 0;
    p.maxAge = lifetime;
    p.px = _localOrigin.x;
    p.py = _localOrigin.y;
    p.pz = _localOrigin.z;
    p.vx = _worldDir.x * speed;
    p.vy = _worldDir.y * speed;
    p.vz = _worldDir.z * speed;
    p.cr = tint[0];
    p.cg = tint[1];
    p.cb = tint[2];
  }

  function spawnBurst(ship: THREE.Group, kind: VentParticleKind, amount: number) {
    const count = burstCountForAmount(amount);
    const tint = tintForKind(kind);
    for (let i = 0; i < count; i++) {
      spawnParticle(ship, tint);
    }
  }

  useFrame((_, delta) => {
    const ship = shipGroupRef.current;
    if (ship) {
      for (const burst of drainVentParticleQueue()) {
        spawnBurst(ship, burst.kind, burst.amount);
      }
    }

    for (let i = 0; i < VENT_PARTICLE_POOL_SIZE; i++) {
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
      positions[i * 3] = p.px;
      positions[i * 3 + 1] = p.py;
      positions[i * 3 + 2] = p.pz;

      const t = p.age / p.maxAge;
      const brightness = Math.pow(1 - t, 1.5) * 0.75;
      colors[i * 3] = p.cr * brightness;
      colors[i * 3 + 1] = p.cg * brightness;
      colors[i * 3 + 2] = p.cb * brightness;
    }

    if (!geoRef.current) return;
    (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.45}
        vertexColors
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
