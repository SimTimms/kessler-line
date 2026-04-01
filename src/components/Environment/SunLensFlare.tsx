import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import {
  LENS_FLARE_GLOW_SIZE,
  LENS_FLARE_GHOST_SIZE,
  LENS_FLARE_RING_SIZE,
  LENS_FLARE_ELEMENTS,
} from '../../config/sunConfig';

/** Radial gradient circle — used for the main glow and ghost elements. */
function buildGlowTexture(size: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Thin ring — used for chromatic ghost elements at mid-distances. */
function buildRingTexture(size: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, half * 0.55, half, half, half * 0.9);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Attaches a lens flare to the sun (world origin).
 * The Three.js Lensflare object handles the screen-space axis and
 * automatic fade when the sun is occluded by scene geometry.
 */
export function SunLensFlare() {
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    const textures = {
      glow: buildGlowTexture(LENS_FLARE_GLOW_SIZE),
      ghost: buildGlowTexture(LENS_FLARE_GHOST_SIZE),
      ring: buildRingTexture(LENS_FLARE_RING_SIZE),
    };

    const lensflare = new Lensflare();

    for (const el of LENS_FLARE_ELEMENTS) {
      lensflare.addElement(
        new LensflareElement(
          textures[el.textureType],
          el.size,
          el.distance,
          new THREE.Color(el.color[0], el.color[1], el.color[2])
        )
      );
    }

    groupRef.current.add(lensflare);

    return () => {
      groupRef.current?.remove(lensflare);
      lensflare.dispose();
      Object.values(textures).forEach((t) => t.dispose());
    };
  }, []);

  // Sun lives at world origin
  return <group ref={groupRef} position={[0, 0, 0]} />;
}
