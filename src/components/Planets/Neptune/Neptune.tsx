import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { NEPTUNE_DEF } from '../config/worldConfig';

// neptune.glb uses the KHR_materials_pbrSpecularGlossiness extension, which
// Three.js r155+ no longer supports. The texture IS embedded in the file —
// we extract it via the GLTF parser and apply it as a standard MeshStandardMaterial.
type GLTFWithParser = {
  scene: THREE.Group;
  parser: { getDependency: (type: string, index: number) => Promise<unknown> };
};

interface NeptuneProps {
  position?: [number, number, number];
  scale?: number;
  color?: THREE.ColorRepresentation;
}

export default function Neptune({
  position = NEPTUNE_DEF.position,
  scale = 1,
  color = 0xffffff,
}: NeptuneProps) {
  const gltf = useGLTF('/neptune.glb') as unknown as GLTFWithParser;
  // Clone the scene so each instance has its own meshes and materials.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    gltf.parser.getDependency('texture', 0).then((tex) => {
      const texture = tex as THREE.Texture;
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({
            map: texture,
            color: new THREE.Color(color),
          });
        }
      });
    });
  }, [gltf, scene, color]);

  return (
    <group position={position} scale={3}>
      <primitive object={scene} />
    </group>
  );
}
