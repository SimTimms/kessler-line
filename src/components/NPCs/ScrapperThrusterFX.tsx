/**
 * Retro-burn thruster particle FX for the AIScrapper.
 *
 * Rendered as a child of the scrapper's <group> so the emitter anchor
 * positions are in scrapper-local space — adjust SCRAPPER_EMITTER_A/B in
 * scrapperConfig.ts to align with the model nozzles.
 *
 * Particles are simulated in local space and transformed to world space using
 * scrapperWorldPos + scrapperWorldQuat (same pattern as ThrusterParticles).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrapperWorldPos, scrapperWorldQuat, scrapperRetroFiring } from '../../context/CinematicState';
import { SCRAPPER_EMITTER_A, SCRAPPER_EMITTER_B } from '../../config/scrapperConfig';

// ── Particle pool config ──────────────────────────────────────────────────────
const POOL_SIZE = 800;
const EMIT_RATE = 400;        // particles/second per nozzle
const BASE_SPEED = 120;
const BASE_LIFETIME = 0.07;
const TAPER_STRENGTH = 10;

// Emit direction: +X (forward) in local space because after the 180° flip the
// model's original forward (+X) now faces away from Venus — which is where the
// exhaust should go.
const EMIT_DIR = new THREE.Vector3(1, 0, 0);

const _worldPos = new THREE.Vector3();

type Particle = {
  active: boolean;
  age: number;
  maxAge: number;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  ox: number; oy: number; oz: number;
};

function makePool(): Particle[] {
  return Array.from({ length: POOL_SIZE }, () => ({
    active: false, age: 0, maxAge: 0,
    px: 0, py: 0, pz: 0,
    vx: 0, vy: 0, vz: 0,
    ox: 0, oy: 0, oz: 0,
  }));
}

function spawn(
  pool: Particle[],
  slotRef: { current: number },
  localPos: [number, number, number],
) {
  const jx = EMIT_DIR.x + (Math.random() - 0.5) * 0.15;
  const jy = EMIT_DIR.y + (Math.random() - 0.5) * 0.15;
  const jz = EMIT_DIR.z + (Math.random() - 0.5) * 0.15;
  const jLen = Math.sqrt(jx * jx + jy * jy + jz * jz);
  const speed = BASE_SPEED * (0.7 + Math.random() * 0.6);
  const lifetime = BASE_LIFETIME * (0.7 + Math.random() * 0.6);

  const idx = slotRef.current;
  slotRef.current = (idx + 1) % POOL_SIZE;
  const p = pool[idx];
  p.active = true;
  p.age = 0;
  p.maxAge = lifetime;
  p.px = p.ox = localPos[0];
  p.py = p.oy = localPos[1];
  p.pz = p.oz = localPos[2];
  p.vx = (jx / jLen) * speed;
  p.vy = (jy / jLen) * speed;
  p.vz = (jz / jLen) * speed;
}

export default function ScrapperThrusterFX() {
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const positions = useMemo(() => new Float32Array(POOL_SIZE * 3), []);
  const colors = useMemo(() => new Float32Array(POOL_SIZE * 3), []);
  const pool = useRef<Particle[]>(makePool());
  const slotRef = useRef(0);
  const accumA = useRef(0);
  const accumB = useRef(0);

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
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  useFrame((_, delta) => {
    // ── Emit ──────────────────────────────────────────────────────────────────
    if (scrapperRetroFiring.current) {
      accumA.current += EMIT_RATE * delta;
      const countA = Math.floor(accumA.current);
      accumA.current -= countA;
      for (let i = 0; i < countA; i++) spawn(pool.current, slotRef, SCRAPPER_EMITTER_A);

      accumB.current += EMIT_RATE * delta;
      const countB = Math.floor(accumB.current);
      accumB.current -= countB;
      for (let i = 0; i < countB; i++) spawn(pool.current, slotRef, SCRAPPER_EMITTER_B);
    } else {
      accumA.current = 0;
      accumB.current = 0;
    }

    // ── Tick ──────────────────────────────────────────────────────────────────
    for (let i = 0; i < POOL_SIZE; i++) {
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

      // Taper toward emit axis
      const t = p.age / p.maxAge;
      const relX = p.px - p.ox, relY = p.py - p.oy, relZ = p.pz - p.oz;
      const axDot = relX * EMIT_DIR.x + relY * EMIT_DIR.y + relZ * EMIT_DIR.z;
      const pull = TAPER_STRENGTH * t * delta;
      p.px -= (relX - EMIT_DIR.x * axDot) * pull;
      p.py -= (relY - EMIT_DIR.y * axDot) * pull;
      p.pz -= (relZ - EMIT_DIR.z * axDot) * pull;

      // Local → world
      _worldPos.set(p.px, p.py, p.pz).applyQuaternion(scrapperWorldQuat).add(scrapperWorldPos);
      positions[i * 3] = _worldPos.x;
      positions[i * 3 + 1] = _worldPos.y;
      positions[i * 3 + 2] = _worldPos.z;

      // Color: white-hot → blue → purple
      const brightness = Math.pow(1 - t, 0.7);
      let r = brightness * Math.max(0, 1 - t * 2.5);
      let g = brightness * Math.max(0.45, 1 - t * 0.9);
      let b = brightness;
      if (t > 0.65) {
        const u = (t - 0.65) / 0.35;
        r = THREE.MathUtils.lerp(r, brightness * 0.7, u);
        g = THREE.MathUtils.lerp(g, brightness * 0.1, u);
        b = THREE.MathUtils.lerp(b, brightness, u);
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
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
        ref={matRef}
        size={2.2}
        map={spriteTexture}
        alphaMap={spriteTexture}
        vertexColors
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
