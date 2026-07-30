import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { ASTEROID_CLAMP_CAPTURE_PROFILE } from '../../config/dockCaptureConfig';
import { selectTarget } from '../../context/TargetSelection';
import type { AsteroidProps } from './Asteroid';

const DEFAULT_URL = '/asteroid-low.glb';

/** Asteroid mesh — optionally mineable (clamp-on-impact + physical collision). */
export default function ColliderAsteroid({
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  mineableId,
  collisionRadius,
  label = 'Asteroid',
}: AsteroidProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  // Clone so each instance is independent (shared GLTF cache is not mutated).
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.color.setRGB(0.0, 0, 0);
        child.material.roughness = 0.9;
        child.material.metalness = 0.8;
      }
    });
  }, [modelScene]);

  useEffect(() => {
    if (!mineableId) return;
    const radius = collisionRadius ?? scale * 0.5;
    registerCollidable({
      id: mineableId,
      stationId: mineableId,
      label,
      shape: { type: 'sphere', radius },
      dockingProfile: ASTEROID_CLAMP_CAPTURE_PROFILE,
      physicalCollision: true,
      getWorldPosition: (target) => {
        groupRef.current?.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        groupRef.current?.getWorldQuaternion(target);
        return target;
      },
      getObject3D: () => groupRef.current,
    });
    return () => unregisterCollidable(mineableId);
  }, [mineableId, collisionRadius, scale, label]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={
        mineableId
          ? (e) => {
              e.stopPropagation();
              const world = new THREE.Vector3();
              groupRef.current?.getWorldPosition(world);
              selectTarget(label, undefined, world, mineableId);
            }
          : undefined
      }
    >
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
