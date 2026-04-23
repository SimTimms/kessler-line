import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLANETS, SOLAR_SYSTEM_SCALE } from '../SolarSystem';
import { solarPlanetPositions } from '../../../context/SolarSystemMinimap';

const WISP_PARTICLES = 2600;
/** Single knob for quickly dialing this effect down later. */
const VISIBILITY_BOOST = 30.2;

const INNER_RADIUS_MULTIPLIER = 1.22;
const WISP_RADIUS_MULTIPLIER = 3.0;

const WISP_RADIUS_SPREAD = 1600;

const WISP_HEIGHT_SPREAD = 200;
const CORE_ROT_SPEED = 0.0018;
const WISP_ROT_SPEED = -0.0012;
const RING_TILT_X = 0.28;
const RING_TILT_Z = -0.02;

const WISP_COLORS = [
  new THREE.Color('#036bfc'),
  new THREE.Color('#66c2ff'),
  new THREE.Color('#036bfc'),
];

const _tmpColor = new THREE.Color();

function makeParticleTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0.0, 'rgba(210,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(120,255,240,0.8)');
  gradient.addColorStop(0.7, 'rgba(70,180,255,0.2)');
  gradient.addColorStop(1.0, 'rgba(70,180,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function buildRingParticles(
  count: number,
  baseRadius: number,
  radialSpread: number,
  verticalSpread: number,
  palette: THREE.Color[],
  waveAmplitude: number
) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const wave = Math.sin(angle * 4 + Math.random() * Math.PI * 2) * waveAmplitude;
    const radius = baseRadius + (Math.random() - 0.5) * 2 * radialSpread + wave;
    const y = (Math.random() - 0.5) * 2 * verticalSpread;

    positions[i * 3 + 0] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    _tmpColor.copy(palette[Math.floor(Math.random() * palette.length)]);
    const brightness = 0.75 + Math.random() * 0.5;
    _tmpColor.multiplyScalar(brightness);
    colors[i * 3 + 0] = _tmpColor.r;
    colors[i * 3 + 1] = _tmpColor.g;
    colors[i * 3 + 2] = _tmpColor.b;
  }

  return { positions, colors };
}

export default function NeptuneInnerWispyRing() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreGroupRef = useRef<THREE.Group>(null!);
  const wispGroupRef = useRef<THREE.Group>(null!);
  const coreMaterialRef = useRef<THREE.PointsMaterial>(null!);
  const wispMaterialRef = useRef<THREE.PointsMaterial>(null!);
  const coreAngleRef = useRef(0);
  const wispAngleRef = useRef(0);
  const pulseRef = useRef(0);

  const neptune = PLANETS.find((planet) => planet.name === 'Neptune');
  const planetRadius = (neptune?.radius ?? 150) * SOLAR_SYSTEM_SCALE;
  const coreRadius = planetRadius * INNER_RADIUS_MULTIPLIER;
  const wispRadius = planetRadius * WISP_RADIUS_MULTIPLIER;

  const { wisps, texture } = useMemo(() => {
    const wisps = buildRingParticles(
      WISP_PARTICLES,
      wispRadius,
      WISP_RADIUS_SPREAD,
      WISP_HEIGHT_SPREAD,
      WISP_COLORS,
      1200
    );
    return { wisps, texture: makeParticleTexture() };
  }, [coreRadius, wispRadius]);

  useFrame((_, delta) => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos || !groupRef.current) return;

    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE
    );
    groupRef.current.rotation.x = RING_TILT_X;
    groupRef.current.rotation.z = RING_TILT_Z;

    coreAngleRef.current += CORE_ROT_SPEED * delta;
    wispAngleRef.current += WISP_ROT_SPEED * delta;
    pulseRef.current += delta;

    if (coreGroupRef.current) coreGroupRef.current.rotation.y = coreAngleRef.current;
    if (wispGroupRef.current) wispGroupRef.current.rotation.y = wispAngleRef.current;

    const pulse = 0.9 + Math.sin(pulseRef.current * 0.7) * 0.1;
    if (wispMaterialRef.current) {
      wispMaterialRef.current.opacity = 0.013 * VISIBILITY_BOOST * pulse;
    }
    if (coreMaterialRef.current) {
      coreMaterialRef.current.opacity = 0.028 * VISIBILITY_BOOST * (1.05 - pulse * 0.35);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={wispGroupRef}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[wisps.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[wisps.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={wispMaterialRef}
            size={4200}
            transparent
            opacity={0.013 * VISIBILITY_BOOST}
            map={texture}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            vertexColors
          />
        </points>
      </group>
    </group>
  );
}
