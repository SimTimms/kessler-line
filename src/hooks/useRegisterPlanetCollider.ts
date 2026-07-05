import { useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';
import { gravityBodies } from '../context/GravityRegistry';

function colliderId(bodyId: string): string {
  return `planet-surface-${bodyId}`;
}

/** World-space spherical collider for a planet/moon/sun surface. */
export function useRegisterPlanetCollider(
  centerRef: RefObject<THREE.Object3D | null>,
  bodyId: string,
  surfaceRadius: number | undefined
) {
  useEffect(() => {
    if (!surfaceRadius || surfaceRadius <= 0) return;

    const id = colliderId(bodyId);
    const getWorldPosition = (target: THREE.Vector3) => {
      if (centerRef.current) centerRef.current.getWorldPosition(target);
      return target;
    };

    registerCollidable({
      id,
      getWorldPosition,
      getWorldVelocity: (target) => {
        const body = gravityBodies.get(bodyId);
        return body ? target.copy(body.velocity) : target.set(0, 0, 0);
      },
      shape: { type: 'sphere', radius: surfaceRadius },
      planetSurfaceImpact: true,
      getObject3D: () => centerRef.current,
    });

    return () => unregisterCollidable(id);
  }, [bodyId, surfaceRadius, centerRef]);
}
