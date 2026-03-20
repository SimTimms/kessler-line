import { useRef, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { gravityBodies } from '../context/GravityRegistry';

// Colony light locations: [longitude (-180..180), latitude (-90..90), cluster radius px, brightness 0..1]
type ColonyPoint = [number, number, number, number];
const MARS_COLONIES: ColonyPoint[] = [
  // Tharsis / Olympus Mons
  [-134, 18, 0.3, 1.0],
  [-130, 22, 0.87, 0.9],
  [-125, 8, 0.53, 0.85],
  [-120, 15, 0.74, 0.8],
  [-115, 25, 0.41, 0.75],
  [-128, 30, 0.96, 0.9],
  [-118, 20, 0.62, 0.85],
  [-110, 12, 0.28, 0.7],
  [-122, 32, 0.79, 0.8],
  [-136, 5, 0.45, 0.75],
  [-142, 18, 0.33, 0.7],
  [-108, 28, 0.68, 0.65],
  // Valles Marineris corridor
  [-46, 14, 0.84, 0.8],
  [-55, 12, 0.57, 0.75],
  [-65, 8, 0.39, 0.7],
  [-80, 5, 0.71, 0.65],
  [-30, 10, 0.92, 0.72],
  [-40, -5, 0.48, 0.68],
  [-60, -10, 0.25, 0.65],
  [-75, -8, 0.63, 0.6],
  [-50, 0, 0.82, 0.73],
  [-35, -3, 0.36, 0.7],
  [-25, 5, 0.55, 0.68],
  [-85, -3, 0.77, 0.6],
  [-70, 2, 0.43, 0.65],
  [-56, -15, 0.91, 0.62],
  [-42, 8, 0.67, 0.72],
  // Arabia Terra / Isidis Planitia
  [87, 13, 0.58, 0.9],
  [70, 5, 0.83, 0.75],
  [95, 20, 0.47, 0.8],
  [100, 10, 0.72, 0.78],
  [80, 25, 0.31, 0.72],
  [110, 15, 0.95, 0.85],
  [65, 12, 0.64, 0.7],
  [90, 28, 0.29, 0.75],
  [75, 8, 0.78, 0.68],
  [105, 22, 0.52, 0.8],
  [115, 5, 0.86, 0.72],
  [82, 18, 0.41, 0.76],
  // Hellas Basin
  [70, -42, 0.73, 0.85],
  [75, -38, 0.56, 0.78],
  [65, -48, 0.89, 0.72],
  [80, -45, 0.34, 0.8],
  [72, -35, 0.67, 0.75],
  [68, -52, 0.48, 0.68],
  [78, -40, 0.81, 0.82],
  [85, -44, 0.26, 0.7],
  [63, -38, 0.94, 0.65],
  [73, -50, 0.61, 0.72],
  // Utopia Planitia
  [160, 40, 0.44, 0.78],
  [145, 45, 0.77, 0.72],
  [155, 35, 0.59, 0.75],
  [165, 50, 0.88, 0.8],
  [130, 38, 0.32, 0.68],
  [150, 55, 0.71, 0.74],
  [138, 42, 0.53, 0.7],
  [170, 48, 0.86, 0.78],
  [142, 30, 0.27, 0.65],
  [162, 35, 0.64, 0.72],
  // Vastitas Borealis / northern plains
  [-20, 56, 0.49, 0.72],
  [-164, 25, 0.76, 0.7],
  [-150, 62, 0.38, 0.65],
  [20, 65, 0.92, 0.68],
  [80, 58, 0.55, 0.72],
  [-100, 70, 0.83, 0.6],
  [140, 55, 0.24, 0.65],
  [-60, 68, 0.67, 0.62],
  [40, 72, 0.91, 0.58],
  [-120, 58, 0.43, 0.63],
  // Argyre Basin
  [110, -28, 0.69, 0.65],
  [118, -45, 0.35, 0.7],
  [122, -38, 0.82, 0.68],
  [115, -52, 0.57, 0.65],
  [125, -42, 0.74, 0.72],
  [130, -48, 0.28, 0.68],
  [107, -35, 0.96, 0.62],
  // Amazonis / Elysium Planitia
  [-155, 30, 0.61, 0.7],
  [-148, 35, 0.45, 0.68],
  [-170, 20, 0.88, 0.65],
  [148, 3, 0.33, 0.7],
  [155, 10, 0.72, 0.72],
  [145, -5, 0.54, 0.68],
  [152, 18, 0.79, 0.65],
  [160, 8, 0.42, 0.7],
  // Scattered mid-lats
  [30, 20, 0.65, 0.6],
  [10, -10, 0.87, 0.58],
  [-10, 30, 0.31, 0.62],
  [50, -15, 0.76, 0.6],
  [0, -20, 0.58, 0.58],
  [35, 40, 0.93, 0.65],
];

// Deterministic per-colony dot offsets so useMemo produces the same texture every render
const DOT_OFFSETS: [number, number][] = [
  [-0.8, -0.6],
  [0.4, -0.9],
  [0.9, 0.3],
  [-0.3, 0.8],
  [0.6, 0.7],
  [-0.7, 0.2],
  [0.1, -0.5],
  [-0.5, -0.4],
  [0.8, -0.3],
  [-0.2, 0.9],
];

function buildColonyTexture(): THREE.CanvasTexture {
  const W = 2048,
    H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, W, H);

  for (const [lon, lat, r, brightness] of MARS_COLONIES) {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;

    // Soft glow halo
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0, `rgba(255, 200, 100, ${brightness * 0.9})`);
    glow.addColorStop(0.4, `rgba(255, 160,  60, ${brightness * 0.4})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);

    // Bright point-lights within each settlement
    ctx.fillStyle = `rgba(255, 240, 180, ${brightness})`;
    for (const [ox, oy] of DOT_OFFSETS) {
      ctx.beginPath();
      ctx.arc(x + ox * r, y + oy * r, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Procedural bump map (craters + terrain) ──────────────────────────────
function buildMarsBumpMap(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Neutral mid-gray base — 128 = flat
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, W, H);

  // Deterministic LCG
  let s = 98765;
  const rand = () => { s = ((s * 1664525 + 1013904223) >>> 0); return s / 0xffffffff; };

  // Large-scale terrain swells
  for (let i = 0; i < 50; i++) {
    const x = rand() * W, y = rand() * H, r = rand() * 240 + 100;
    const v = Math.floor(128 + (rand() - 0.5) * 60);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Large craters
  for (let i = 0; i < 80; i++) {
    const x = rand() * W, y = rand() * H, r = rand() * 60 + 20;
    const bowl = ctx.createRadialGradient(x, y, 0, x, y, r * 0.85);
    bowl.addColorStop(0, 'rgba(70,70,70,0.85)');
    bowl.addColorStop(0.7, 'rgba(100,100,100,0.4)');
    bowl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // Raised rim
    ctx.strokeStyle = 'rgba(195,195,195,0.55)';
    ctx.lineWidth = r * 0.12 + 1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.stroke();
  }

  // Medium craters
  for (let i = 0; i < 400; i++) {
    const x = rand() * W, y = rand() * H, r = rand() * 18 + 4;
    const bowl = ctx.createRadialGradient(x, y, 0, x, y, r);
    bowl.addColorStop(0, 'rgba(75,75,75,0.80)');
    bowl.addColorStop(0.75, 'rgba(110,110,110,0.25)');
    bowl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(185,185,185,0.45)';
    ctx.lineWidth = r * 0.15 + 0.5;
    ctx.beginPath(); ctx.arc(x, y, r * 0.88, 0, Math.PI * 2); ctx.stroke();
  }

  // Small pits
  for (let i = 0; i < 1200; i++) {
    const x = rand() * W, y = rand() * H, r = rand() * 5 + 1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(85,85,85,0.75)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const _planetWorldPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const VISIBILITY_DIST = 15_000_000; // world-space units; ~15M covers cross-system visibility

interface OrbitingPlanetProps {
  planetName: string;
  orbitRadius: number;
  radius: number; // world-space sphere radius (in SolarSystem local space)
  color: string;
  glowColor?: string; // tint for the background glow sprite (defaults to color)
  textureUrl?: string;
  emissive?: string;
  orbitalSpeed: number; // rad/s
  spinSpeed: number; // rad/s (negative = retrograde)
  axialTilt: number; // radians
  initialAngle: number; // radians
  rings?: boolean;
  showColonies?: boolean; // render procedural colony-lights emissive map
  useBumpMap?: boolean; // render procedural crater bump map
  gravityMu?: number; // GM in world-space units (optional)
  gravitySoiRadius?: number; // sphere of influence radius in world-space units (optional)
  gravitySurfaceRadius?: number; // physical surface radius in world-space units (optional)
  gravityOrbitAltitude?: number; // ideal orbit altitude above surface (optional)
}

export default function OrbitingPlanet({
  planetName,
  orbitRadius,
  radius,
  color,
  glowColor,
  textureUrl,
  emissive = '#000000',
  orbitalSpeed,
  spinSpeed,
  axialTilt,
  initialAngle,
  rings = false,
  showColonies = false,
  useBumpMap = false,
  gravityMu,
  gravitySoiRadius,
  gravitySurfaceRadius,
  gravityOrbitAltitude,
}: OrbitingPlanetProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const planetCenterRef = useRef<THREE.Group>(null);
  const meshVisRef = useRef<THREE.Group>(null);
  const prevWorldPosRef = useRef(new THREE.Vector3());
  const hasPrevWorldPosRef = useRef(false);
  const texture = useTexture(
    textureUrl ??
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9L5bQAAAAASUVORK5CYII='
  );

  const soiRing = useMemo(() => {
    if (gravitySoiRadius === undefined || gravitySurfaceRadius === undefined) return null;
    const soiLocalRadius = (gravitySoiRadius / gravitySurfaceRadius) * radius;
    const segments = 128;
    const arr = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      arr[i * 3] = Math.cos(theta) * soiLocalRadius;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(theta) * soiLocalRadius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0x4499ff,
      dashSize: soiLocalRadius * 0.04,
      gapSize: soiLocalRadius * 0.04,
      opacity: 0.35,
      transparent: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [gravitySoiRadius, gravitySurfaceRadius, radius]);

  const coloniesTexture = useMemo(
    () => (showColonies ? buildColonyTexture() : null),
    [showColonies]
  );

  const bumpTexture = useMemo(
    () => (useBumpMap ? buildMarsBumpMap() : null),
    [useBumpMap]
  );

  const glowTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    if (orbitRef.current) orbitRef.current.rotation.y = initialAngle;
    hasPrevWorldPosRef.current = false;

    if (
      gravityMu !== undefined &&
      gravitySoiRadius !== undefined &&
      gravitySurfaceRadius !== undefined &&
      gravityOrbitAltitude !== undefined
    ) {
      gravityBodies.set(planetName, {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        mu: gravityMu,
        soiRadius: gravitySoiRadius,
        surfaceRadius: gravitySurfaceRadius,
        orbitAltitude: gravityOrbitAltitude,
      });
    }

    return () => {
      gravityBodies.delete(planetName);
    };
  }, [
    initialAngle,
    planetName,
    gravityMu,
    gravitySoiRadius,
    gravitySurfaceRadius,
    gravityOrbitAltitude,
  ]);

  useFrame(({ camera }, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += orbitalSpeed * delta;
      const θ = orbitRef.current.rotation.y;
      solarPlanetPositions[planetName] = {
        x: Math.cos(θ) * orbitRadius,
        z: -Math.sin(θ) * orbitRadius,
      };
    }
    if (spinRef.current) spinRef.current.rotation.y += spinSpeed * delta;

    // Update gravity body world position each frame
    if (planetCenterRef.current && gravityBodies.has(planetName)) {
      planetCenterRef.current.getWorldPosition(_planetWorldPos);
      const body = gravityBodies.get(planetName)!;
      if (hasPrevWorldPosRef.current && delta > 0) {
        body.velocity
          .subVectors(_planetWorldPos, prevWorldPosRef.current)
          .multiplyScalar(1 / delta);
      } else {
        body.velocity.set(0, 0, 0);
      }
      prevWorldPosRef.current.copy(_planetWorldPos);
      hasPrevWorldPosRef.current = true;
      body.position.copy(_planetWorldPos);
    }

    // Distance-based visibility — orbits still tick; only the mesh is hidden.
    // Reuse _planetWorldPos if gravity already populated it, otherwise fetch it here.
    if (meshVisRef.current && planetCenterRef.current) {
      if (!gravityBodies.has(planetName)) {
        planetCenterRef.current.getWorldPosition(_planetWorldPos);
      }
      camera.getWorldPosition(_camPos);
      meshVisRef.current.visible = _camPos.distanceTo(_planetWorldPos) < VISIBILITY_DIST;
    }
  });

  return (
    <group ref={orbitRef}>
      <group ref={planetCenterRef} position={[orbitRadius, 0, 0]}>
        <group ref={meshVisRef}>
          {/* Background glow billboard — always faces camera, additive blending */}
          <sprite scale={[radius * 65, radius * 65, 1]}>
            <spriteMaterial
              map={glowTexture}
              color={glowColor ?? color}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              transparent
              opacity={0.01}
              fog={false}
            />
          </sprite>

          {/* Axial tilt applied once; spin group rotates around the tilted axis */}
          <group rotation-x={axialTilt}>
            <group ref={spinRef}>
              <mesh>
                <sphereGeometry args={[radius, 64, 64]} />
                <meshStandardMaterial
                  color={color}
                  emissive={showColonies ? '#ffb050' : emissive}
                  emissiveMap={coloniesTexture}
                  emissiveIntensity={showColonies ? 1.5 : 1.0}
                  roughness={0.8}
                  map={textureUrl ? texture : null}
                  bumpMap={bumpTexture}
                  bumpScale={useBumpMap ? -0.6 : 0}
                  fog={false}
                />
              </mesh>

              {rings && (
                <mesh rotation-x={Math.PI / 2}>
                  <ringGeometry args={[radius * 1.4, radius * 2.3, 64]} />
                  <meshStandardMaterial
                    color="#c2a878"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.75}
                    fog={false}
                  />
                </mesh>
              )}
            </group>
          </group>

          {/* Sphere of influence boundary — blue dashed ring in the XZ plane */}
          {soiRing && <primitive object={soiRing} />}
        </group>
      </group>
    </group>
  );
}
