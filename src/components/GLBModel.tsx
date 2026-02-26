import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameTime } from '../context/TimeProvider';

interface GLBModelProps {
  url: string;
  scale?: number;
}

export default function GLBModel({ url, scale = 1 }: GLBModelProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const { time } = useGameTime();

  // store references to meshes you want to animate
  const bedroomMeshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    gltf.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.name.includes('Bedroom')) {
          bedroomMeshes.current.push(obj);

          // ensure emissive exists
          obj.material.emissive = new THREE.Color('red');
          obj.material.emissiveIntensity = 0;
        }
      }
    });
  }, [gltf]);

  // animate emissive based on time of day
  useFrame(() => {
    // convert time (0–24) into a smooth night factor (0–1)
    // 1 = midnight, 0 = noon
    const nightFactor = Math.max(0, Math.cos(((time - 12) / 24) * Math.PI * 2));
    // scale brightness
    const intensity = THREE.MathUtils.lerp(0, 10, nightFactor);

    bedroomMeshes.current.forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material && 'emissiveIntensity' in material) {
        material.emissiveIntensity = intensity;
      }
    });
  });

  return <primitive object={gltf.scene} scale={scale} />;
}
