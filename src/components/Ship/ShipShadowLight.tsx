import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';

/**
 * Directional light that tracks the ship so the shadow frustum always covers it.
 * The light sits at a fixed offset above-and-behind the ship; its target stays
 * on the ship, keeping the shadow angle consistent regardless of position.
 *
 * Render this as a sibling of <Spaceship /> inside a scene that has shadows enabled.
 */
export default function ShipShadowLight({
  intensity,
  color,
}: {
  intensity: number;
  color: string;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();

  useEffect(() => {
    // The directional light target must be in the scene for updateMatrixWorld to work.
    if (lightRef.current) scene.add(lightRef.current.target);
    return () => {
      if (lightRef.current) scene.remove(lightRef.current.target);
    };
  }, [scene]);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const { x, z } = shipPosRef.current;
    light.position.set(x + 150, 250, z + 80);
    light.target.position.set(x, 0, z);
    light.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={intensity}
      color={color}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-120}
      shadow-camera-right={120}
      shadow-camera-top={120}
      shadow-camera-bottom={-120}
      shadow-camera-near={10}
      shadow-camera-far={600}
      shadow-bias={-0.001}
    />
  );
}
