import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';

const RADIUS = 50_000_000;

function makeStarfieldTexture(): THREE.CanvasTexture {
  const width = 4096;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 8000 stars — varied sizes, occasional colour tints
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() < 0.03 ? Math.random() * 2 + 1.5 : Math.random() * 1.0 + 0.3;
    const brightness = Math.random() * 0.05 + 0.05;

    const rnd = Math.random();
    let r = 255,
      g = 255,
      b = 255;
    if (rnd < 0.04) {
      r = 160;
      g = 190;
      b = 255;
    } // blue-white
    else if (rnd < 0.07) {
      r = 255;
      g = 230;
      b = 160;
    } // warm yellow
    else if (rnd < 0.09) {
      r = 255;
      g = 170;
      b = 120;
    } // orange-red

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${brightness})`;
    ctx.fill();

    // Soft diffuse glow for bright stars
    if (size > 1.2) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
      glow.addColorStop(0, `rgba(${r},${g},${b},${(brightness * 0.25).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(x, y, size * 4, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }
  }

  // Faint Milky Way band
  const band = ctx.createLinearGradient(0, height * 0.35, 0, height * 0.65);
  band.addColorStop(0, 'rgba(70, 90, 160, 0)');
  band.addColorStop(0.5, 'rgba(70, 90, 160, 0.045)');
  band.addColorStop(1, 'rgba(70, 90, 160, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function SkySphere() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useMemo(() => makeStarfieldTexture(), []);

  // Follow the ship so the stars always appear infinitely far away
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(shipPosRef.current);
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[RADIUS, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}
