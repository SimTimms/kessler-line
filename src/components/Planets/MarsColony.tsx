import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

interface MarsColonyProps {
  radius: number;
  scale?: number;
}

export default function MarsColony({ radius, scale = 0.5 }: MarsColonyProps) {
  const { scene } = useGLTF('/colony.glb');
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={clonedScene} position={[0, 40.8, -20]} scale={0.01} />;
}
