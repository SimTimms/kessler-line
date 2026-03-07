import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 6000;
const HALF = 150; // half-extent of the wrapping cube (300 units across)

function makeParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

interface SpaceParticlesProps {
  shipPositionRef: { current: THREE.Vector3 };
}

export default function SpaceParticles({ shipPositionRef }: SpaceParticlesProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null!);

  const { positions, texture } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * HALF * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * HALF * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * HALF * 2;
    }
    return { positions, texture: makeParticleTexture() };
  }, []);

  useFrame(() => {
    if (!geoRef.current) return;
    const ship = shipPositionRef.current;
    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const b = i * 3;
      // Wrap each axis — keeps the field centred on the ship as it moves
      const sx = ship.x,
        sy = ship.y,
        sz = ship.z;
      if (arr[b + 0] - sx > HALF) arr[b + 0] -= HALF * 2;
      else if (arr[b + 0] - sx < -HALF) arr[b + 0] += HALF * 2;
      if (arr[b + 1] - sy > HALF) arr[b + 1] -= HALF * 2;
      else if (arr[b + 1] - sy < -HALF) arr[b + 1] += HALF * 2;
      if (arr[b + 2] - sz > HALF) arr[b + 2] -= HALF * 2;
      else if (arr[b + 2] - sz < -HALF) arr[b + 2] += HALF * 2;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="white"
        size={0.4}
        transparent
        opacity={0.55}
        map={texture}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
