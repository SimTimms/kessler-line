import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { computeBodyOrbitWorldPosition, type BodyOrbitParams } from '../utils/bodyOrbit';

/**
 * Positions an object on a kinematic circular orbit around the Sun or a planet.
 * Updates `groupRef.current.position` each frame — no physics integration.
 */
export function useBodyOrbit(
  groupRef: RefObject<THREE.Object3D | null>,
  params: BodyOrbitParams
): void {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    computeBodyOrbitWorldPosition(paramsRef.current, clock.getElapsedTime(), groupRef.current.position);
  });
}
