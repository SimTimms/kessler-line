import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { useScannableRegistration } from '../../hooks/useScannableRegistration';
import type { DerelictRecord } from '../../context/DerelictStore';
import { cloneGltfScene } from '../../utils/cloneGltfScene';

/** Dim all materials on a cloned scene for a derelict look. */
function darkenMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      const clone = mat.clone();
      clone.color.multiplyScalar(0.3);
      clone.emissive.set(0, 0, 0);
      clone.emissiveIntensity = 0;
      clone.metalness = Math.max(clone.metalness, 0.7);
      clone.roughness = Math.max(clone.roughness, 0.8);
      if (Array.isArray(mesh.material)) {
        mesh.material[i] = clone;
      } else {
        mesh.material = clone;
      }
    }
  });
}

const COLLISION_HALF_EXTENTS = new THREE.Vector3(7, 3, 17);

/** Slow random tumble axis — randomized per instance. */
function randomTumbleAxis(): THREE.Vector3 {
  return new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5,
  ).normalize();
}

interface DerelictShipProps {
  record: DerelictRecord;
}

export default function DerelictShip({ record }: DerelictShipProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const gltf = useGLTF(record.modelUrl) as unknown as { scene: THREE.Group };

  const clonedScene = useMemo(() => {
    const clone = cloneGltfScene(gltf.scene);
    darkenMaterials(clone);
    return clone;
  }, [gltf.scene]);

  const tumbleAxis = useMemo(() => randomTumbleAxis(), []);
  const tumbleSpeed = useMemo(() => 0.02 + Math.random() * 0.04, []); // rad/s

  // Register as physical collidable
  useEffect(() => {
    const id = `collision-${record.id}`;
    registerCollidable({
      id,
      label: 'Derelict Hull',
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      shape: { type: 'box', halfExtents: COLLISION_HALF_EXTENTS },
      getObject3D: () => groupRef.current,
      physicalCollision: true,
    });
    return () => unregisterCollidable(id);
  }, [record.id]);

  // Register magnetic signature
  useScannableRegistration({
    id: `mag-${record.id}`,
    label: 'Derelict Hull',
    groupRef,
    magnet: true,
    proximity: true,
    proximityShape: { type: 'box', halfExtents: COLLISION_HALF_EXTENTS },
  });

  // Slow tumble each frame
  const _q = useMemo(() => new THREE.Quaternion(), []);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    _q.setFromAxisAngle(tumbleAxis, tumbleSpeed * delta);
    groupRef.current.quaternion.premultiply(_q);
  });

  return (
    <group
      ref={groupRef}
      position={[record.position.x, record.position.y, record.position.z]}
      quaternion={[record.quaternion.x, record.quaternion.y, record.quaternion.z, record.quaternion.w]}
    >
      <primitive
        object={clonedScene}
        scale={1}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}
