import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface DecorativeAsteroidDef {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
}

// Module-level dummy avoids allocating a new Object3D every frame.
const _dummy = new THREE.Object3D();

/**
 * Renders a static field of decorative (non-interactive) asteroids as a single
 * InstancedMesh — one draw call regardless of count.
 */
export default function DecorativeAsteroidField({
  url = '/asteroid-low.glb',
  asteroids,
  normalScale = 0.6,
}: {
  url?: string;
  asteroids: DecorativeAsteroidDef[];
  /** Multiplier on the model's normal map. 1 = as authored, 0 = flat shading. */
  normalScale?: number;
}) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const material = useMemo(() => {
    const firstMesh = gltf.scene.getObjectByProperty('type', 'Mesh');
    if (firstMesh instanceof THREE.Mesh) {
      const sourceMaterial: THREE.Material = Array.isArray(firstMesh.material)
        ? firstMesh.material[0]
        : firstMesh.material;

      // Clone before mutating: the source belongs to the shared useGLTF cache.
      const cloned = sourceMaterial.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.normalScale.set(normalScale, normalScale);
      }
      return cloned;
    }

    return new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.8 });
  }, [gltf.scene, normalScale]);

  const geometry = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    // Ensure world matrices are current before reading them.
    gltf.scene.updateWorldMatrix(true, true);
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry.clone();
        // Bake the sub-mesh's local transform so instances are positioned correctly.
        geo.applyMatrix4(child.matrixWorld);
        geos.push(geo);
      }
    });
    if (geos.length === 0) return new THREE.BufferGeometry();
    if (geos.length === 1) return geos[0];
    return mergeGeometries(geos) ?? geos[0];
  }, [gltf.scene]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    asteroids.forEach((a, i) => {
      _dummy.position.set(a.position[0], a.position[1], a.position[2]);
      _dummy.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
      _dummy.scale.setScalar(a.scale ?? 1);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [asteroids]);

  return <instancedMesh ref={meshRef} args={[geometry, material, asteroids.length]} />;
}

useGLTF.preload('/asteroid-low.glb');
