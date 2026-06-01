import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildLunarTextures } from '../../utils/lunarTextureGen';
import LunarSettlement from './LunarSettlement';
import { LUNAR_MOON_RADIUS, LUNAR_SETTLEMENT_COVERAGE } from '../../config/lunarLandscapeConfig';
import { MOON_BODY_ID } from '../../config/moonConfig';
import { useRegisterPlanetCollider } from '../../hooks/useRegisterPlanetCollider';

const TEXTURE_REPEAT_U = 8;
const TEXTURE_REPEAT_V = 4;
const MOON_ROTATION_SPEED = 0.02;
const SETTLEMENT_SCALE = 0.3;

export default function LunarTutorial() {
  const { gl } = useThree();
  const moonCenterRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  useRegisterPlanetCollider(moonCenterRef, MOON_BODY_ID, LUNAR_MOON_RADIUS);

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
    <group ref={moonCenterRef} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
      <group ref={spinRef}>
        <mesh receiveShadow renderOrder={0}>
          <sphereGeometry args={[LUNAR_MOON_RADIUS, 128, 128]} />
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
        <group rotation={[Math.PI / 2, 0, Math.PI / 1.8]}>
          <LunarSettlement
            moonRadius={LUNAR_MOON_RADIUS}
            coverage={LUNAR_SETTLEMENT_COVERAGE}
            scale={SETTLEMENT_SCALE}
          />
        </group>
      </group>
    </group>
  );
}
