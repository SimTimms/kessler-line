import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type * as THREE from 'three';

const DEFAULT_URL = '/space_garbage_truck-low.glb';

export interface BackgroundGarbageScowProps {
  url?: string;
  scale?: number;
  position?: [number, number, number];
  /** Euler rotation in radians. */
  rotation?: [number, number, number];
  /** Extra rotation applied to the loaded GLB primitive (model-local). */
  modelRotation?: [number, number, number];
}

/**
 * Non-player decorative garbage scow — mesh only, no physics / docking / HUD.
 */
export default function BackgroundGarbageScow({
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  modelRotation = [0, Math.PI / 2, 0],
}: BackgroundGarbageScowProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={modelScene} rotation={modelRotation} />
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
