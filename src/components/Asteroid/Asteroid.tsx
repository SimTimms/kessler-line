import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_URL = '/asteroid-low.glb';

export interface AsteroidProps {
  url?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  mineableId?: string;
  collisionRadius?: number;
  label?: string;
}

export default function Asteroid({
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: AsteroidProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.normalScale = 0.1;
      }
    });
  }, [modelScene]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
