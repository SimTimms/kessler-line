import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from '../SolarSystem';

const PARTICLE_COUNT = 5000;
const RING_RADIUS = 90000; // matches ship starting orbit distance
const RING_RADIUS_SPREAD = 1200; // ± radial fuzz for a soft cloud look
const RING_HEIGHT = 500; // ± y spread (300 units total)
const RING_ROTATION_SPEED = 0.0015; // rad/s — slow debris drift

const COLORS = [
  new THREE.Color(0xffffff), // white
  new THREE.Color(0xaaddff), // light blue
  new THREE.Color(0xaaddff), // purple
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
  const angleRef = useRef(0);

  const { positions, colors, texture } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colorData = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = RING_RADIUS + (Math.random() - 0.5) * 2 * RING_RADIUS_SPREAD;
      const y = (Math.random() - 0.5) * 2 * RING_HEIGHT;

      positions[i * 3 + 0] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      colorData[i * 3 + 0] = color.r;
      colorData[i * 3 + 1] = color.g;
      colorData[i * 3 + 2] = color.b;
    }

    return { positions, colors: colorData, texture: makeParticleTexture() };
  }, []);

  useFrame((_, delta) => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos || !groupRef.current) return;

    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE
    );

    angleRef.current += RING_ROTATION_SPEED * delta;
    groupRef.current.rotation.y = angleRef.current;
  });

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={10050}
          transparent
          opacity={0.0055}
          map={texture}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          vertexColors
        />
      </points>
    </group>
  );
}
