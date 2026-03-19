/**
 * MarsSystem — Phobos, Deimos, and orbital satellites around Mars.
 *
 * Rendered at world-space root (not inside the SolarSystem scaled group).
 * Each frame, the root group tracks Mars's world position from gravityBodies
 * so the moons follow Mars as it orbits the Sun.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';

// ── Scale helpers ──────────────────────────────────────────────────────────
// Same power-law as SolarSystem.tsx, expressed in world-space units.
const rW = (realKm: number) =>
  Math.pow(realKm / 696_340, 0.2) * 100 * SOLAR_SYSTEM_SCALE;

const MARS_R = rW(3_390); // ~138 world units

// Moons: use the formula but clamp to minimum visible size
const PHOBOS_R = Math.max(rW(11.267), 18); // ~44 wu → floors at 18
const DEIMOS_R = Math.max(rW(6.2), 12);    // ~39 wu → floors at 12

// Orbital radii maintain real moon:Mars radius ratios
const PHOBOS_ORBIT = (9_376 / 3_390) * MARS_R;   // ~382 world units
const DEIMOS_ORBIT = (23_459 / 3_390) * MARS_R;  // ~956 world units

// Real inclinations to the Mars equatorial plane (nearly zero)
const PHOBOS_INC = 1.093 * (Math.PI / 180);
const DEIMOS_INC = 0.93 * (Math.PI / 180);

// Visual orbital speeds — real ratio preserved (Phobos 4× faster than Deimos)
// Full real-scale (2π / period_in_game_seconds) is hundreds of rad/s → invisible.
// We cap at a visually readable pace while keeping the ratio.
const PHOBOS_ORBIT_SPEED = 0.40; // rad/s  ≈ 15.7 s orbit
const DEIMOS_ORBIT_SPEED = 0.10; // rad/s  ≈ 62.8 s orbit

// Gravity — artificially boosted (same approach as PLANETS in SolarSystem.tsx)
const MOON_SURFACE_G = 2.0;
const moonGravParams = (worldRadius: number) => ({
  mu: MOON_SURFACE_G * worldRadius * worldRadius,
  soiRadius: worldRadius * 6.0,
  surfaceRadius: worldRadius,
  orbitAltitude: worldRadius * 3.0,
});

// ── Procedural rocky surface texture ─────────────────────────────────────
function buildRockyTexture(
  seed: number,
  base: [number, number, number]
): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // LCG so the texture is deterministic
  let s = seed >>> 0;
  const rand = () => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0xffffffff;
  };

  const [r0, g0, b0] = base;
  ctx.fillStyle = `rgb(${r0},${g0},${b0})`;
  ctx.fillRect(0, 0, W, H);

  // Dark crater patches
  for (let i = 0; i < 220; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = rand() * 22 + 2;
    const dk = Math.floor(rand() * 35);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0,   `rgba(${r0 - dk},${g0 - dk},${b0 - dk},0.65)`);
    gr.addColorStop(0.65,`rgba(${r0 - dk},${g0 - dk},${b0 - dk},0.20)`);
    gr.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright crater rims
  for (let i = 0; i < 120; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = rand() * 10 + 1;
    const br = Math.floor(rand() * 28);
    ctx.strokeStyle = `rgba(${Math.min(255, r0 + br)},${Math.min(255, g0 + br)},${Math.min(255, b0 + br)},0.45)`;
    ctx.lineWidth = rand() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Stickney-like large crater for Phobos (seed 42 → draw one big crater)
  if (seed === 42) {
    const sx = 0.62 * W, sy = 0.45 * H, sr = 44;
    const sgr = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sgr.addColorStop(0,   `rgba(${r0 - 40},${g0 - 40},${b0 - 40},0.80)`);
    sgr.addColorStop(0.75,`rgba(${r0 - 20},${g0 - 20},${b0 - 20},0.35)`);
    sgr.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = sgr;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    // Rim highlight
    ctx.strokeStyle = `rgba(${Math.min(255, r0 + 30)},${Math.min(255, g0 + 30)},${Math.min(255, b0 + 30)},0.55)`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Colony emissive texture ───────────────────────────────────────────────
type ColonyPt = [number, number, number, number]; // [lon, lat, px_radius, brightness]
const DOT_OFFSETS: [number, number][] = [
  [-0.7, -0.5], [0.5, -0.8], [0.8, 0.4], [-0.4, 0.7], [0.6, 0.6],
];

function buildColonyTexture(colonies: ColonyPt[]): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, W, H);

  for (const [lon, lat, r, bright] of colonies) {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0,   `rgba(255, 210, 120, ${bright * 0.95})`);
    glow.addColorStop(0.4, `rgba(255, 160,  60, ${bright * 0.40})`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);

    ctx.fillStyle = `rgba(255, 240, 180, ${bright})`;
    for (const [ox, oy] of DOT_OFFSETS) {
      ctx.beginPath();
      ctx.arc(x + ox * r, y + oy * r, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Satellite helper ──────────────────────────────────────────────────────
// A simple box + solar-panel mesh that orbits a given radius.
function Satellite({
  orbitRadius,
  orbitSpeed,
  orbitPhase = 0,
  inclinationZ = 0,
  inclinationX = 0,
}: {
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase?: number;
  inclinationZ?: number;
  inclinationX?: number;
}) {
  const orbitRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += orbitSpeed * delta;
  });

  return (
    <group rotation-z={inclinationZ} rotation-x={inclinationX}>
      <group ref={orbitRef} rotation-y={orbitPhase}>
        <group position={[orbitRadius, 0, 0]}>
          {/* Body */}
          <mesh>
            <boxGeometry args={[5, 2.5, 5]} />
            <meshStandardMaterial
              color="#aaaaaa"
              metalness={0.85}
              roughness={0.25}
              emissive="#111111"
              fog={false}
            />
          </mesh>
          {/* Port solar panel */}
          <mesh position={[11, 0, 0]}>
            <boxGeometry args={[13, 0.4, 4.5]} />
            <meshStandardMaterial
              color="#334499"
              metalness={0.7}
              roughness={0.3}
              emissive="#001144"
              fog={false}
            />
          </mesh>
          {/* Starboard solar panel */}
          <mesh position={[-11, 0, 0]}>
            <boxGeometry args={[13, 0.4, 4.5]} />
            <meshStandardMaterial
              color="#334499"
              metalness={0.7}
              roughness={0.3}
              emissive="#001144"
              fog={false}
            />
          </mesh>
          {/* Dish antenna */}
          <mesh position={[0, 2.5, 0]} rotation-x={Math.PI / 4}>
            <cylinderGeometry args={[2, 0.2, 2, 12]} />
            <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} fog={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ── SOI dashed ring (equatorial plane of moon) ────────────────────────────
function SoiRing({ radius }: { radius: number }) {
  const ring = useMemo(() => {
    const segments = 128;
    const arr = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const θ = (i / segments) * Math.PI * 2;
      arr[i * 3]     = Math.cos(θ) * radius;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(θ) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0x4499ff,
      dashSize: radius * 0.06,
      gapSize: radius * 0.06,
      opacity: 0.30,
      transparent: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [radius]);

  return <primitive object={ring} />;
}

// ── Main component ────────────────────────────────────────────────────────
export default function MarsSystem() {
  const rootRef          = useRef<THREE.Group>(null);
  const phobosOrbitRef   = useRef<THREE.Group>(null);
  const deimosOrbitRef   = useRef<THREE.Group>(null);
  const phobosCenterRef  = useRef<THREE.Group>(null);
  const deimosCenterRef  = useRef<THREE.Group>(null);

  const phobosPrevPos    = useRef(new THREE.Vector3());
  const deimosPrevPos    = useRef(new THREE.Vector3());
  const hasPhobosPrev    = useRef(false);
  const hasDeimoPrev     = useRef(false);

  // Procedural surface textures
  const phobosMap = useMemo(() => buildRockyTexture(42,  [88, 76, 66]), []);
  const deimosMap = useMemo(() => buildRockyTexture(137, [102, 90, 78]), []);

  // Colony emissive maps
  const phobosColony = useMemo(() => buildColonyTexture([
    // Stickney crater cluster — main base
    [  0,  5, 1, 1.00], [  8,  2, 1, 0.85], [ -5, 10, 1, 0.80],
    [ 12,  8, 1, 0.75], [ -8,  0, 1, 0.78], [  5,-12, 1, 0.70],
    // Southern polar research
    [-60,-28, 1, 0.75], [-55,-20, 1, 0.65], [-65,-32, 1, 0.68], [-58,-35, 1, 0.62],
    // Limb relay stations
    [ 90, 15, 1, 0.70], [ 85, -5, 1, 0.65], [ 95, 20, 1, 0.62],
    // Anti-sub hemisphere
    [-90, 10, 1, 0.68], [-85, -8, 1, 0.60],
    // Scattered outposts
    [ 30, 40, 1, 0.65], [-30, 35, 1, 0.62], [ 45,-15, 1, 0.60],
    [-45, 20, 1, 0.63], [150,-10, 1, 0.58],
  ]), []);

  const deimosColony = useMemo(() => buildColonyTexture([
    // Northern relay — main station
    [ 55, 18, 1, 0.95], [ 60, 12, 1, 0.80], [ 50, 22, 1, 0.75], [ 62, 28, 1, 0.70],
    // Anti-Mars side
    [-80, -5, 1, 0.72], [-75,  8, 1, 0.65], [-85,-10, 1, 0.60],
    // Southern mining outpost
    [  0,-30, 1, 0.65], [ 10,-25, 1, 0.60],
    // Far hemisphere relay
    [150, 15, 1, 0.62],
  ]), []);

  // Register gravity bodies once on mount
  useEffect(() => {
    if (phobosOrbitRef.current) phobosOrbitRef.current.rotation.y = 0.5;
    if (deimosOrbitRef.current) deimosOrbitRef.current.rotation.y = 2.1;

    gravityBodies.set('Phobos', {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      ...moonGravParams(PHOBOS_R),
    });
    gravityBodies.set('Deimos', {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      ...moonGravParams(DEIMOS_R),
    });

    return () => {
      gravityBodies.delete('Phobos');
      gravityBodies.delete('Deimos');
    };
  }, []);

  useFrame((_, delta) => {
    // Follow Mars in world space
    const mars = gravityBodies.get('Mars');
    if (rootRef.current && mars) {
      rootRef.current.position.copy(mars.position);
    }

    // Advance orbits
    if (phobosOrbitRef.current) phobosOrbitRef.current.rotation.y += PHOBOS_ORBIT_SPEED * delta;
    if (deimosOrbitRef.current) deimosOrbitRef.current.rotation.y += DEIMOS_ORBIT_SPEED * delta;

    // Update Phobos world position + velocity for gravity system
    const phobosBody = gravityBodies.get('Phobos');
    if (phobosCenterRef.current && phobosBody) {
      phobosCenterRef.current.getWorldPosition(phobosBody.position);
      if (hasPhobosPrev.current && delta > 0) {
        phobosBody.velocity
          .subVectors(phobosBody.position, phobosPrevPos.current)
          .multiplyScalar(1 / delta);
      } else {
        phobosBody.velocity.set(0, 0, 0);
      }
      phobosPrevPos.current.copy(phobosBody.position);
      hasPhobosPrev.current = true;
    }

    // Update Deimos world position + velocity
    const deimosBody = gravityBodies.get('Deimos');
    if (deimosCenterRef.current && deimosBody) {
      deimosCenterRef.current.getWorldPosition(deimosBody.position);
      if (hasDeimoPrev.current && delta > 0) {
        deimosBody.velocity
          .subVectors(deimosBody.position, deimosPrevPos.current)
          .multiplyScalar(1 / delta);
      } else {
        deimosBody.velocity.set(0, 0, 0);
      }
      deimosPrevPos.current.copy(deimosBody.position);
      hasDeimoPrev.current = true;
    }
  });

  const phobosSoiWorld = moonGravParams(PHOBOS_R).soiRadius;
  const deimosSoiWorld = moonGravParams(DEIMOS_R).soiRadius;

  return (
    <group ref={rootRef}>

      {/* ── Mars orbital satellites ─────────────────────────────────────── */}
      {/* Reconnaissance satellite — polar orbit */}
      <Satellite
        orbitRadius={MARS_R * 2.8}
        orbitSpeed={0.22}
        orbitPhase={0.0}
        inclinationZ={Math.PI / 2}     // polar orbit
        inclinationX={0.05}
      />
      {/* Communications relay — equatorial */}
      <Satellite
        orbitRadius={MARS_R * 3.6}
        orbitSpeed={0.15}
        orbitPhase={2.1}
        inclinationZ={0.15}
        inclinationX={0.0}
      />
      {/* Science platform — inclined */}
      <Satellite
        orbitRadius={MARS_R * 4.5}
        orbitSpeed={0.10}
        orbitPhase={4.3}
        inclinationZ={0.5}
        inclinationX={0.2}
      />

      {/* ── Phobos ─────────────────────────────────────────────────────── */}
      {/* Inclination ~1.1° to Mars equatorial plane */}
      <group rotation-x={PHOBOS_INC} ref={phobosOrbitRef}>
        <group ref={phobosCenterRef} position={[PHOBOS_ORBIT, 0, 0]}>
          {/* Surface sphere */}
          <mesh>
            <sphereGeometry args={[PHOBOS_R, 48, 48]} />
            <meshStandardMaterial
              color="#ffffff"
              map={phobosMap}
              emissive="#ffaa44"
              emissiveMap={phobosColony}
              emissiveIntensity={2.5}
              roughness={0.97}
              metalness={0.05}
              fog={false}
            />
          </mesh>
          {/* SOI ring */}
          <SoiRing radius={phobosSoiWorld} />
          {/* Satellite in low Phobos orbit */}
          <Satellite
            orbitRadius={PHOBOS_R * 3.0}
            orbitSpeed={1.4}
            orbitPhase={0.8}
            inclinationZ={0.3}
          />
        </group>
      </group>

      {/* ── Deimos ─────────────────────────────────────────────────────── */}
      {/* Inclination ~0.9° to Mars equatorial plane */}
      <group rotation-x={DEIMOS_INC} ref={deimosOrbitRef}>
        <group ref={deimosCenterRef} position={[DEIMOS_ORBIT, 0, 0]}>
          {/* Surface sphere */}
          <mesh>
            <sphereGeometry args={[DEIMOS_R, 48, 48]} />
            <meshStandardMaterial
              color="#ffffff"
              map={deimosMap}
              emissive="#ffaa44"
              emissiveMap={deimosColony}
              emissiveIntensity={2.5}
              roughness={0.95}
              metalness={0.05}
              fog={false}
            />
          </mesh>
          {/* SOI ring */}
          <SoiRing radius={deimosSoiWorld} />
          {/* Satellite in low Deimos orbit */}
          <Satellite
            orbitRadius={DEIMOS_R * 3.0}
            orbitSpeed={0.9}
            orbitPhase={1.5}
            inclinationZ={-0.4}
          />
        </group>
      </group>
    </group>
  );
}
