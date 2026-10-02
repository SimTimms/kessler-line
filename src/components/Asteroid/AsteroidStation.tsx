import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_URL = '/models/asteroid-station.glb';
/** Same as decorative salvage rocks — authored GLB normals are too strong at world scale. */
const DEFAULT_NORMAL_SCALE = 0.05;

export interface AsteroidStationProps {
  url?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  mineableId?: string;
  collisionRadius?: number;
  label?: string;
  /** Multiplier on the model's normal map. 1 = as authored, 0 = flat shading. */
  normalScale?: number;
}

function applyAsteroidSurface(material: THREE.Material, normalScale: number): THREE.Material {
  const cloned = material.clone();
  if (cloned instanceof THREE.MeshStandardMaterial) {
    cloned.normalScale.set(normalScale, normalScale);
    // Huge unique meshes read as black metal once the specular highlight shrinks.
    cloned.roughness = Math.max(cloned.roughness, 0.88);
    cloned.metalness = Math.min(cloned.metalness, 0.2);
    cloned.fog = false;
  }
  return cloned;
}

export default function AsteroidStation({
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  normalScale = DEFAULT_NORMAL_SCALE,
}: AsteroidStationProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    modelScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      // GLB meshes often import with receiveShadow. A 500× rock then self-shadows
      // into a black blob as soon as the tiny default shadow camera can see it.
      child.castShadow = false;
      child.receiveShadow = false;
      const source = child.material;
      child.material = Array.isArray(source)
        ? source.map((mat) => applyAsteroidSurface(mat, normalScale))
        : applyAsteroidSurface(source, normalScale);
    });
  }, [modelScene, normalScale]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
