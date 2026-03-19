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
  [-134, 18, 1, 1.00], [-130, 22, 1, 0.90], [-125,  8, 1, 0.85], [-120, 15, 1, 0.80],
  [-115, 25, 1, 0.75], [-128, 30, 1, 0.90], [-118, 20, 1, 0.85], [-110, 12, 1, 0.70],
  [-122, 32, 1, 0.80], [-136,  5, 1, 0.75], [-142, 18, 1, 0.70], [-108, 28, 1, 0.65],
  // Valles Marineris corridor
  [ -46, 14, 1, 0.80], [ -55, 12, 1, 0.75], [ -65,  8, 1, 0.70], [ -80,  5, 1, 0.65],
  [ -30, 10, 1, 0.72], [ -40, -5, 1, 0.68], [ -60,-10, 1, 0.65], [ -75, -8, 1, 0.60],
  [ -50,  0, 1, 0.73], [ -35, -3, 1, 0.70], [ -25,  5, 1, 0.68], [ -85, -3, 1, 0.60],
  [ -70,  2, 1, 0.65], [ -56,-15, 1, 0.62], [ -42,  8, 1, 0.72],
  // Arabia Terra / Isidis Planitia
  [  87, 13, 1, 0.90], [  70,  5, 1, 0.75], [  95, 20, 1, 0.80], [ 100, 10, 1, 0.78],
  [  80, 25, 1, 0.72], [ 110, 15, 1, 0.85], [  65, 12, 1, 0.70], [  90, 28, 1, 0.75],
  [  75,  8, 1, 0.68], [ 105, 22, 1, 0.80], [ 115,  5, 1, 0.72], [  82, 18, 1, 0.76],
  // Hellas Basin
  [  70,-42, 1, 0.85], [  75,-38, 1, 0.78], [  65,-48, 1, 0.72], [  80,-45, 1, 0.80],
  [  72,-35, 1, 0.75], [  68,-52, 1, 0.68], [  78,-40, 1, 0.82], [  85,-44, 1, 0.70],
  [  63,-38, 1, 0.65], [  73,-50, 1, 0.72],
  // Utopia Planitia
  [ 160, 40, 1, 0.78], [ 145, 45, 1, 0.72], [ 155, 35, 1, 0.75], [ 165, 50, 1, 0.80],
  [ 130, 38, 1, 0.68], [ 150, 55, 1, 0.74], [ 138, 42, 1, 0.70], [ 170, 48, 1, 0.78],
  [ 142, 30, 1, 0.65], [ 162, 35, 1, 0.72],
  // Vastitas Borealis / northern plains
  [ -20, 56, 1, 0.72], [-164, 25, 1, 0.70], [-150, 62, 1, 0.65], [  20, 65, 1, 0.68],
  [  80, 58, 1, 0.72], [-100, 70, 1, 0.60], [ 140, 55, 1, 0.65], [ -60, 68, 1, 0.62],
  [  40, 72, 1, 0.58], [-120, 58, 1, 0.63],
  // Argyre Basin
  [ 110,-28, 1, 0.65], [ 118,-45, 1, 0.70], [ 122,-38, 1, 0.68], [ 115,-52, 1, 0.65],
  [ 125,-42, 1, 0.72], [ 130,-48, 1, 0.68], [ 107,-35, 1, 0.62],
  // Amazonis / Elysium Planitia
  [-155, 30, 1, 0.70], [-148, 35, 1, 0.68], [-170, 20, 1, 0.65], [ 148,  3, 1, 0.70],
  [ 155, 10, 1, 0.72], [ 145, -5, 1, 0.68], [ 152, 18, 1, 0.65], [ 160,  8, 1, 0.70],
  // Scattered mid-lats
  [  30, 20, 1, 0.60], [  10,-10, 1, 0.58], [ -10, 30, 1, 0.62],
  [  50,-15, 1, 0.60], [   0,-20, 1, 0.58], [  35, 40, 1, 0.65],
];

// Deterministic per-colony dot offsets so useMemo produces the same texture every render
const DOT_OFFSETS: [number, number][] = [
  [-0.8, -0.6], [0.4, -0.9], [0.9, 0.3], [-0.3, 0.8], [0.6, 0.7],
  [-0.7, 0.2],  [0.1, -0.5], [-0.5, -0.4], [0.8, -0.3], [-0.2, 0.9],
];

function buildColonyTexture(): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, W, H);

  for (const [lon, lat, r, brightness] of MARS_COLONIES) {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;

    // Soft glow halo
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0,   `rgba(255, 200, 100, ${brightness * 0.9})`);
    glow.addColorStop(0.4, `rgba(255, 160,  60, ${brightness * 0.4})`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
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

const _planetWorldPos = new THREE.Vector3();

interface OrbitingPlanetProps {
  planetName: string;
  orbitRadius: number;
  radius: number; // world-space sphere radius (in SolarSystem local space)
  color: string;
  textureUrl?: string;
  emissive?: string;
  orbitalSpeed: number; // rad/s
  spinSpeed: number; // rad/s (negative = retrograde)
  axialTilt: number; // radians
  initialAngle: number; // radians
  rings?: boolean;
  showColonies?: boolean; // render procedural colony-lights emissive map
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
  textureUrl,
  emissive = '#000000',
  orbitalSpeed,
  spinSpeed,
  axialTilt,
  initialAngle,
  rings = false,
  showColonies = false,
  gravityMu,
  gravitySoiRadius,
  gravitySurfaceRadius,
  gravityOrbitAltitude,
}: OrbitingPlanetProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const planetCenterRef = useRef<THREE.Group>(null);
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
      arr[i * 3]     = Math.cos(theta) * soiLocalRadius;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(theta) * soiLocalRadius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0x4499ff,
      dashSize: soiLocalRadius * 0.04,
      gapSize:  soiLocalRadius * 0.04,
      opacity: 0.35,
      transparent: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [gravitySoiRadius, gravitySurfaceRadius, radius]);

  const coloniesTexture = useMemo(() => (showColonies ? buildColonyTexture() : null), [showColonies]);

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

  useFrame((_, delta) => {
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
  });

  return (
    <group ref={orbitRef}>
      <group ref={planetCenterRef} position={[orbitRadius, 0, 0]}>
        {/* Axial tilt applied once; spin group rotates around the tilted axis */}
        <group rotation-x={axialTilt}>
          <group ref={spinRef}>
            <mesh>
              <sphereGeometry args={[radius, 64, 64]} />
              <meshStandardMaterial
                color={color}
                emissive={showColonies ? '#ffb050' : emissive}
                emissiveMap={coloniesTexture}
                emissiveIntensity={showColonies ? 2.5 : 1.0}
                roughness={0.8}
                map={textureUrl ? texture : null}
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
  );
}
