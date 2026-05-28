import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export const PERSON_MODEL_URL = '/person.glb';

export default function Person() {
  const gltf = useGLTF(PERSON_MODEL_URL) as unknown as { scene: THREE.Group };

  return <primitive object={gltf.scene} scale={0.01} />;
}

useGLTF.preload(PERSON_MODEL_URL);
