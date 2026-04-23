import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from '../SolarSystem';

const CORE_PARTICLE_COUNT = 4500;
const HALO_PARTICLE_COUNT = 6500;
const RING_RADIUS = 90000; // matches ship starting orbit distance
const CORE_RING_RADIUS_SPREAD = 1000; // bright inner band thickness
const HALO_RING_RADIUS_SPREAD = 8000; // wider diffuse halo
const CORE_RING_HEIGHT = 700;
const HALO_RING_HEIGHT = 4200;
const CORE_ROTATION_SPEED = 0.0015; // rad/s
const HALO_ROTATION_SPEED = -0.0007; // opposite direction adds turbulence
const RING_TILT_X = -0.23;
const RING_TILT_Z = 0.09;

const CORE_COLORS = [
  new THREE.Color('#d8ffff'),
  new THREE.Color('#7ef3ff'),
  new THREE.Color('#4fdfff'),
  new THREE.Color('#f2ffff'),
];

const HALO_COLORS = [
  new THREE.Color('#62dfff'),
  new THREE.Color('#2fa7ff'),
  new THREE.Color('#8befff'),
];

function makeParticleTexture(): THREE.Texture {
  const size = 2064;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255,165,0,1)');
  gradient.addColorStop(1, 'rgba(225,128,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function NeptuneDustRing() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreGroupRef = useRef<THREE.Group>(null!);
  const haloGroupRef = useRef<THREE.Group>(null!);
  const coreMaterialRef = useRef<THREE.PointsMaterial>(null!);
  const haloMaterialRef = useRef<THREE.PointsMaterial>(null!);
  const coreAngleRef = useRef(0);
  const haloAngleRef = useRef(0);
  const pulseTimeRef = useRef(0);

  const { corePositions, coreColors, haloPositions, haloColors, texture } = useMemo(() => {
    const makeRing = (
      particleCount: number,
      radialSpread: number,
      verticalSpread: number,
      palette: THREE.Color[],
      radialJitter = 0
    ) => {
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const localRadius =
          RING_RADIUS +
          (Math.random() - 0.5) * 2 * radialSpread +
          Math.sin(angle * 3.0 + Math.random() * Math.PI * 2) * radialJitter;
        const y = (Math.random() - 0.5) * 2 * verticalSpread;

        positions[i * 3 + 0] = Math.cos(angle) * localRadius;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(angle) * localRadius;

        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3 + 0] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      return { positions, colors };
    };

    const core = makeRing(
      CORE_PARTICLE_COUNT,
      CORE_RING_RADIUS_SPREAD,
      CORE_RING_HEIGHT,
      CORE_COLORS,
      1400
    );
    const halo = makeRing(
      HALO_PARTICLE_COUNT,
      HALO_RING_RADIUS_SPREAD,
      HALO_RING_HEIGHT,
      HALO_COLORS,
      2600
    );

    return {
      corePositions: core.positions,
      coreColors: core.colors,
      haloPositions: halo.positions,
      haloColors: halo.colors,
      texture: makeParticleTexture(),
    };
  }, []);

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

    coreAngleRef.current += CORE_ROTATION_SPEED * delta;
    haloAngleRef.current += HALO_ROTATION_SPEED * delta;
    pulseTimeRef.current += delta;

    if (coreGroupRef.current) coreGroupRef.current.rotation.y = coreAngleRef.current;
    if (haloGroupRef.current) haloGroupRef.current.rotation.y = haloAngleRef.current;

    const pulse = 0.84 + Math.sin(pulseTimeRef.current * 0.45) * 0.16;
    if (coreMaterialRef.current) coreMaterialRef.current.opacity = 0.018 * pulse;
    if (haloMaterialRef.current) haloMaterialRef.current.opacity = 0.006 * (1.05 - pulse * 0.35);
  });

  return (
    <group ref={groupRef}>
      <group ref={haloGroupRef}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[haloPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[haloColors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={haloMaterialRef}
            size={9200}
            transparent
            opacity={0.006}
            map={texture}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            vertexColors
          />
        </points>
      </group>

      <group ref={coreGroupRef}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[corePositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[coreColors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={coreMaterialRef}
            size={6200}
            transparent
            opacity={0.018}
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
