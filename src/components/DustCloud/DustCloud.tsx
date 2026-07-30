import { useRef, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const HALO_PARTICLE_COUNT = 50;

const HALO_COLORS = [
  new THREE.Color('#757aff'),
  new THREE.Color('#757aff'),
  new THREE.Color('#f538f5'),
];
interface DustCloudProps {
  yInitial?: number;
  radius?: number;
  particleSize?: number;
  radialSpread?: number;
  colors?: THREE.Color[];
  opacity?: number;
}

export default function DustCloud({
  yInitial = 0,
  radius = 550000,
  /** World-unit point size (scales with camera distance / zoom). */
  particleSize,
  radialSpread = 9,
  colors = HALO_COLORS,
  opacity = 0.1,
}: DustCloudProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const haloGroupRef = useRef<THREE.Group>(null!);
  const haloMaterialRef = useRef<THREE.PointsMaterial>(null!);
  const texture = useTexture('/cloud.png');
  const paletteKey = colors.map((color) => color.getHexString()).join('|');
  // Default ~12% of cloud radius — tuned for world-space size attenuation.
  const resolvedParticleSize = particleSize ?? radius * 0.12;

  const { haloPositions, haloColors } = useMemo(() => {
    const makeRing = (
      particleCount: number,
      radialSpread: number,
      palette: THREE.Color[],
      radialJitter = 0
    ) => {
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const localRadius =
          radius +
          (Math.random() - 0.5) * 2 * radialSpread +
          Math.sin(angle * 3.0 + Math.random() * Math.PI * 2) * radialJitter;

        positions[i * 3 + 0] = -(localRadius * 0.5) + Math.random() * localRadius;
        positions[i * 3 + 1] = yInitial;
        positions[i * 3 + 2] = -(localRadius * 0.5) + Math.random() * localRadius;

        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3 + 0] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      return { positions, colors };
    };

    const halo = makeRing(HALO_PARTICLE_COUNT, radialSpread, colors, 1400);

    return {
      haloPositions: halo.positions,
      haloColors: halo.colors,
    };
  }, [paletteKey, radius, radialSpread, yInitial]);

  return (
    <group ref={groupRef}>
      <group ref={haloGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[haloPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[haloColors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={haloMaterialRef}
            size={resolvedParticleSize}
            transparent
            opacity={opacity}
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
