import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STARFIELD_HALF as HALF } from '../../config/particleConfig';
import { shipPosRef } from '../../context/ShipPos';
import { getGraphicsSettings } from '../../context/GraphicsState';

// Keep stars well away from the player/camera so foreground objects can occlude them.
const STARFIELD_MIN_RADIUS = HALF * 0.55;
const STARFIELD_MAX_RADIUS = HALF;

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

function placeOnStarShell(
  arr: Float32Array,
  baseIndex: number,
  centerX: number,
  centerY: number,
  centerZ: number
) {
  const u = Math.random();
  const v = Math.random();
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  const radius = STARFIELD_MIN_RADIUS + Math.random() * (STARFIELD_MAX_RADIUS - STARFIELD_MIN_RADIUS);
  const sinPhi = Math.sin(phi);
  arr[baseIndex + 0] = centerX + radius * sinPhi * Math.cos(theta);
  arr[baseIndex + 1] = centerY + radius * Math.cos(phi);
  arr[baseIndex + 2] = centerZ + radius * sinPhi * Math.sin(theta);
}

export default function SpaceParticles() {
  const geoRef = useRef<THREE.BufferGeometry>(null!);

  const { positions, texture, count } = useMemo(() => {
    const COUNT = getGraphicsSettings().starfieldCount;
    const { x: sx, y: sy, z: sz } = shipPosRef.current;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      placeOnStarShell(positions, i * 3, sx, sy, sz);
    }
    return { positions, texture: makeParticleTexture(), count: COUNT };
  }, []);

  useFrame(() => {
    if (!geoRef.current) return;
    const ship = shipPosRef.current;
    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
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

      const dx = arr[b + 0] - sx;
      const dy = arr[b + 1] - sy;
      const dz = arr[b + 2] - sz;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < STARFIELD_MIN_RADIUS * STARFIELD_MIN_RADIUS) {
        placeOnStarShell(arr, b, sx, sy, sz);
      }
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
        size={4}
        transparent
        opacity={0.95}
        map={texture}
        depthTest
        depthWrite={false}
        blending={THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  );
}
