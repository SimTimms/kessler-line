import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import { getGraphicsSettings } from '../../context/GraphicsState';

const RADIUS = 10000000;

function makeStarfieldTexture(
  width: number,
  height: number,
  starCount: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() < 0.003 ? Math.random() * 0.05 : Math.random() * 1.0 + 0.003;
    const brightness = Math.random() * 0.05 + 10.05;

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
  const groupRef = useRef<THREE.Group>(null!);
  const outerTexture = useMemo(() => {
    const { skyTextureWidth, skyTextureHeight, skyStarCount } = getGraphicsSettings();
    const tex = makeStarfieldTexture(skyTextureWidth, skyTextureHeight, skyStarCount);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.offset.set(0, 0);
    return tex;
  }, []);
  const innerTexture = useMemo(() => {
    const { skyTextureWidth, skyTextureHeight, skyStarCount } = getGraphicsSettings();
    const tex = makeStarfieldTexture(skyTextureWidth, skyTextureHeight, skyStarCount);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 8;
    tex.offset.set(0.14, -0.06);
    return tex;
  }, []);

  // Follow the ship so the stars always appear infinitely far away
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(shipPosRef.current);
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false} renderOrder={-1}>
      <mesh frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[RADIUS, 64, 32]} />
        <meshBasicMaterial
          map={outerTexture}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          alphaTest={0.01}
        />
      </mesh>
      <mesh frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[RADIUS * 0.05, 64, 32]} />
        <meshBasicMaterial
          map={innerTexture}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          alphaTest={0.01}
          color="#ffccff"
        />
      </mesh>
    </group>
  );
}
