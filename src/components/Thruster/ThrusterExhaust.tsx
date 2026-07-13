import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  THRUSTER_LIGHT_COLOR,
  THRUSTER_LIGHT_DECAY,
  THRUSTER_LIGHT_DISTANCE,
  THRUSTER_LIGHT_INTENSITY_MAIN,
  THRUSTER_LIGHT_INTENSITY_RCS,
  THRUSTER_MAIN_EMIT_RATE,
  THRUSTER_PARTICLE_LIFETIME,
  THRUSTER_PARTICLE_POOL,
  THRUSTER_PARTICLE_SPEED,
  THRUSTER_RCS_EMIT_RATE,
} from '../../config/thrusterConfig';
import { getThruster } from '../../context/ThrusterRegistry';
import type { ThrusterKind } from '../../context/ThrusterRegistry';

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
};

function makePool(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    active: false,
    age: 0,
    maxAge: 0,
    px: 0,
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
  }));
}

interface ThrusterExhaustProps {
  thrusterId: string;
  kind: ThrusterKind;
  exhaustDirection: THREE.Vector3;
  showParticles?: boolean;
  showLight?: boolean;
}

export default function ThrusterExhaust({
  thrusterId,
  kind,
  exhaustDirection,
  showParticles = true,
  showLight = true,
}: ThrusterExhaustProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const positions = useMemo(() => new Float32Array(THRUSTER_PARTICLE_POOL * 3), []);
  const colors = useMemo(() => new Float32Array(THRUSTER_PARTICLE_POOL * 3), []);
  const pool = useRef<Particle[]>(makePool(THRUSTER_PARTICLE_POOL));
  const slot = useRef(0);
  const accum = useRef(0);

  const spriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);

  useFrame((_, delta) => {
    const firing = getThruster(thrusterId)?.firing ?? false;
    const emitRate = kind === 'main' ? THRUSTER_MAIN_EMIT_RATE : THRUSTER_RCS_EMIT_RATE;
    const pointSize = kind === 'main' ? 1.4 : 0.18;
    const lightIntensity = kind === 'main' ? THRUSTER_LIGHT_INTENSITY_MAIN : THRUSTER_LIGHT_INTENSITY_RCS;

    if (lightRef.current) {
      lightRef.current.intensity = firing ? lightIntensity : 0;
    }
    if (matRef.current) {
      matRef.current.size = pointSize;
    }

    if (firing && showParticles) {
      accum.current += emitRate * delta;
      const count = Math.floor(accum.current);
      accum.current -= count;
      for (let i = 0; i < count; i++) {
        const idx = slot.current;
        slot.current = (idx + 1) % THRUSTER_PARTICLE_POOL;
        const p = pool.current[idx];
        const jx = exhaustDirection.x + (Math.random() - 0.5) * 0.15;
        const jy = exhaustDirection.y + (Math.random() - 0.5) * 0.15;
        const jz = exhaustDirection.z + (Math.random() - 0.5) * 0.15;
        const len = Math.sqrt(jx * jx + jy * jy + jz * jz);
        const speed = THRUSTER_PARTICLE_SPEED * (0.7 + Math.random() * 0.6);
        p.active = true;
        p.age = 0;
        p.maxAge = THRUSTER_PARTICLE_LIFETIME * (0.7 + Math.random() * 0.6);
        p.px = p.py = p.pz = 0;
        p.vx = (jx / len) * speed;
        p.vy = (jy / len) * speed;
        p.vz = (jz / len) * speed;
      }
    } else {
      accum.current = 0;
    }

    if (!showParticles) return;

    for (let i = 0; i < THRUSTER_PARTICLE_POOL; i++) {
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
      const brightness = Math.pow(1 - t, 0.7);
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.85;
      colors[i * 3 + 2] = brightness;
    }

    if (!geoRef.current) return;
    (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      {showParticles ? (
        <points frustumCulled={false}>
          <bufferGeometry ref={geoRef}>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={matRef}
            map={spriteTexture}
            alphaMap={spriteTexture}
            vertexColors
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
            sizeAttenuation
            size={kind === 'main' ? 1.4 : 0.18}
          />
        </points>
      ) : null}
      {showLight ? (
        <pointLight
          ref={lightRef}
          color={THRUSTER_LIGHT_COLOR}
          distance={THRUSTER_LIGHT_DISTANCE}
          decay={THRUSTER_LIGHT_DECAY}
          intensity={0}
        />
      ) : null}
    </>
  );
}
