import { useMemo } from 'react';
import * as THREE from 'three';
import {
  NEBULA_COUNT as COUNT,
  NEBULA_SPREAD as SPREAD,
  NEBULA_LARGE_COUNT,
  NEBULA_HUE_MIN,
  NEBULA_HUE_MAX,
} from '../../config/particleConfig';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PuffData {
  position: [number, number, number];
  scale: number;
  color: THREE.Color;
  opacity: number;
}

interface NebulaCloudProps {
  center: [number, number, number];
}

export default function NebulaClouds({ center }: NebulaCloudProps) {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const puffs = useMemo<PuffData[]>(() => {
    const rng = mulberry32(77431);
    const result: PuffData[] = [];

    for (let i = 0; i < COUNT; i++) {
      // Ellipsoidal distribution — flattened strongly on Y for a disc-like nebula
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      // Bias toward centre with cube-root radius
      const r = SPREAD * Math.cbrt(rng());
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.18; // very flat
      const z = r * Math.cos(phi);

      // Purple → blue-purple → violet range
      const hue = NEBULA_HUE_MIN + rng() * (NEBULA_HUE_MAX - NEBULA_HUE_MIN);
      const sat = 0.45 + rng() * 0.45;
      const lit = 0.25 + rng() * 0.35;
      const color = new THREE.Color().setHSL(hue, sat, lit);

      // Vary size: large atmospheric puffs + smaller denser ones
      const scale = i < NEBULA_LARGE_COUNT
        ? 1800 + rng() * 3500   // large background puffs
        : 300 + rng() * 1200;   // smaller foreground ones

      const opacity = i < NEBULA_LARGE_COUNT
        ? 0.025 + rng() * 0.055  // large puffs — very subtle
        : 0.04 + rng() * 0.09;   // smaller puffs — slightly denser

      result.push({
        position: [center[0] + x, center[1] + y, center[2] + z],
        scale,
        color,
        opacity,
      });
    }
    return result;
  }, [center]);

  return (
    <>
      {puffs.map((puff, i) => (
        <sprite
          key={i}
          position={puff.position}
          scale={[puff.scale, puff.scale, 1]}
          renderOrder={-10}
        >
          <spriteMaterial
            map={texture}
            color={puff.color}
            opacity={puff.opacity}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={true}
          />
        </sprite>
      ))}
    </>
  );
}
