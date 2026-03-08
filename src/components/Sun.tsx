import { useMemo } from 'react';
import * as THREE from 'three';

interface SunProps {
  radius: number;
}

function createGodRayTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // 6 well-spaced rays (every 60°), long primary + short secondary offset by 30°
  const rayDefs = [
    { angle: 0, length: size * 0.47, width: 7 },
    { angle: Math.PI / 6, length: size * 0.28, width: 4 },
    { angle: Math.PI / 3, length: size * 0.47, width: 7 },
    { angle: Math.PI / 2, length: size * 0.28, width: 4 },
    { angle: (2 * Math.PI) / 3, length: size * 0.47, width: 7 },
    { angle: (5 * Math.PI) / 6, length: size * 0.28, width: 4 },
    { angle: Math.PI, length: size * 0.47, width: 7 },
    { angle: (7 * Math.PI) / 6, length: size * 0.28, width: 4 },
    { angle: (4 * Math.PI) / 3, length: size * 0.47, width: 7 },
    { angle: (3 * Math.PI) / 2, length: size * 0.28, width: 4 },
    { angle: (5 * Math.PI) / 3, length: size * 0.47, width: 7 },
    { angle: (11 * Math.PI) / 6, length: size * 0.28, width: 4 },
  ];

  for (const { angle, length, width } of rayDefs) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, 0, length);
    grad.addColorStop(0.0, 'rgba(255, 255, 245, 0.95)');
    grad.addColorStop(0.2, 'rgba(255, 230, 200, 0.55)');
    grad.addColorStop(0.55, 'rgba(200, 140, 220, 0.20)');
    grad.addColorStop(0.8, 'rgba(150,  80, 200, 0.08)');
    grad.addColorStop(1.0, 'rgba(100,  40, 180, 0.00)');

    ctx.beginPath();
    ctx.moveTo(-width / 2, 2);
    ctx.lineTo(0, length);
    ctx.lineTo(width / 2, 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  // Soft radial glow at center to blend ray roots
  const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  centerGlow.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  centerGlow.addColorStop(0.4, 'rgba(255, 250, 220, 0.7)');
  centerGlow.addColorStop(1.0, 'rgba(255, 220, 120, 0.0)');

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = centerGlow;
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

export default function Sun({ radius }: SunProps) {
  const godRayTexture = useMemo(() => createGodRayTexture(), []);

  return (
    <group position={[0, 0, 0]}>
      {/* Blazing white-hot core */}
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color="#FFFDF0"
          emissive="#FFFFFF"
          emissiveIntensity={6}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      {/* Inner corona — pale yellow halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.22, 32, 32]} />
        <meshStandardMaterial
          color="#FFF8D0"
          emissive="#FFF8D0"
          emissiveIntensity={3}
          transparent
          opacity={0.28}
          side={THREE.FrontSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      {/* 
      <mesh>
        <sphereGeometry args={[radius * 1.7, 32, 32]} />
        <meshStandardMaterial
          color="#FFE88A"
          emissive="#FFE88A"
          emissiveIntensity={1.2}
          transparent
          opacity={0.07}
          side={THREE.FrontSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

  
      <sprite scale={[radius * 18, radius * 18, 1]}>
        <spriteMaterial
          map={godRayTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          fog={false}
          toneMapped={false}
        />
      </sprite>
      */}

      <pointLight color="#fff8e0" intensity={20000000} distance={200000} decay={1.5} />
    </group>
  );
}
