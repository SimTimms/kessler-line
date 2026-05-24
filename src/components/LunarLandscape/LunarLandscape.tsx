import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildLunarTextures } from '../../utils/lunarTextureGen';

// Sphere radius — large enough to look flat from low altitude
const MOON_RADIUS = 10000;
// Surface sits at world y = -150; sphere center is below that by the radius
const SURFACE_Y = -900;
// How many times the texture tiles around the sphere (U) and pole-to-pole (V)
const TEXTURE_REPEAT_U = 8;
const TEXTURE_REPEAT_V = 4;

const MOON_ROTATION_SPEED = 0.02;

export default function LunarLandscape() {
  const { gl } = useThree();
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += MOON_ROTATION_SPEED * delta;
  });
  const { colorMap, bumpMap } = useMemo(() => {
    const maps = buildLunarTextures(2048, 2048);
    for (const tex of [maps.colorMap, maps.bumpMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(TEXTURE_REPEAT_U, TEXTURE_REPEAT_V);
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    }
    return maps;
  }, [gl]);

  useEffect(() => {
    return () => {
      colorMap.dispose();
      bumpMap.dispose();
    };
  }, [colorMap, bumpMap]);

  return (
    // Center is MOON_RADIUS below the surface so the top of the sphere sits at SURFACE_Y
    <group position={[0, SURFACE_Y - MOON_RADIUS, 0]} rotation={[Math.PI / 2, Math.PI, 0]}>
      <group ref={spinRef}>
        <mesh receiveShadow>
          <sphereGeometry args={[MOON_RADIUS, 128, 128]} />
          <meshStandardMaterial
            map={colorMap}
            bumpMap={bumpMap}
            bumpScale={3}
            displacementMap={bumpMap}
            displacementScale={0}
            displacementBias={-12.5}
            roughness={0.95}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  );
}
