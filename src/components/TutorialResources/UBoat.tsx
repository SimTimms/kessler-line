import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function UBoat() {
  const gltf = useGLTF('/uboat-ruin.glb') as unknown as { scene: THREE.Group };

  return <primitive object={gltf.scene} scale={30} position={[0, 0, 0]} />;
}
