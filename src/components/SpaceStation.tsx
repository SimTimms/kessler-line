import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function SpaceStation() {
  const gltf = useGLTF('/capital-station.glb') as unknown as { scene: THREE.Group };
  return <primitive object={gltf.scene} scale={0.1} />;
}
