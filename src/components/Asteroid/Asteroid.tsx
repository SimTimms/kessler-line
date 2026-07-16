import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_URL = '/asteroid.glb';

export interface AsteroidProps {
  url?: string;
  scale?: number;
  position?: [number, number, number];
  /** Euler rotation in radians. */
  rotation?: [number, number, number];
}

/** Decorative asteroid mesh — no collision / docking. */
export default function Asteroid({
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: AsteroidProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  // Clone so each instance is independent (shared GLTF cache is not mutated).
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  //go through the object and change the material to a mesh standard material with a color of red

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
