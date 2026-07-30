import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface CameraAttachedCockpitProps {
  url: string;
  localPosition?: [number, number, number];
  localRotation?: [number, number, number];
  scale?: number;
}

/**
 * Cockpit mesh parented to the active Canvas camera so it stays fixed in view.
 */
export default function CameraAttachedCockpit({
  url,
  localPosition = [0, 0, 0],
  localRotation = [0, 0, 0],
  scale = 1,
}: CameraAttachedCockpitProps) {
  const { camera } = useThree();
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const root = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((obj) => {
      obj.frustumCulled = false;
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return clone;
  }, [gltf.scene]);

  useLayoutEffect(() => {
    root.position.set(...localPosition);
    root.rotation.set(...localRotation);
    root.scale.setScalar(scale);
    camera.add(root);
    return () => {
      camera.remove(root);
    };
  }, [camera, root, localPosition, localRotation, scale]);

  return null;
}

useGLTF.preload('/shuttle-low-british-cockpit.glb');
