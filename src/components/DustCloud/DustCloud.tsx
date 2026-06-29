import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const CORE_PARTICLE_COUNT = 500;
const HALO_PARTICLE_COUNT = 500;
const RING_RADIUS = 5000000; // matches ship starting orbit distance
const CORE_RING_RADIUS_SPREAD = 0; // bright inner band thickness
const HALO_RING_RADIUS_SPREAD = 9; // wider diffuse halo


const CORE_COLORS = [
  new THREE.Color('#ff0000'),
  new THREE.Color('#ff0000'),
  new THREE.Color('#ff0000'),
  new THREE.Color('#ff0000'),
];

const HALO_COLORS = [
  new THREE.Color('#ff0000'),
  new THREE.Color('#2fa7ff'),
  new THREE.Color('#ff0000'),
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
interface DustCloudProps {
  yInitial?: number;
}

export default function DustCloud({ yInitial = 0 }: DustCloudProps  ) {
  const groupRef = useRef<THREE.Group>(null!);
  const coreGroupRef = useRef<THREE.Group>(null!);
  const haloGroupRef = useRef<THREE.Group>(null!);
  const coreMaterialRef = useRef<THREE.PointsMaterial>(null!);
  const haloMaterialRef = useRef<THREE.PointsMaterial>(null!);

  const { corePositions, coreColors, haloPositions, haloColors, texture } = useMemo(() => {
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
          RING_RADIUS +
          (Math.random() - 0.5) * 2 * radialSpread +
          Math.sin(angle * 3.0 + Math.random() * Math.PI * 2) * radialJitter;

        positions[i * 3 + 0] =-( localRadius*0.5)+(Math.random() * localRadius);
        positions[i * 3 + 1] = yInitial ;
        positions[i * 3 + 2] =-( localRadius*0.5)+(Math.random() * localRadius);

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
      CORE_COLORS,
      1400
    );
    
    const halo = makeRing(
      HALO_PARTICLE_COUNT,
      HALO_RING_RADIUS_SPREAD,
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
            size={2000000}
            transparent
            opacity={0.6}
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
            size={600200}
            transparent
            opacity={0.48}
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
