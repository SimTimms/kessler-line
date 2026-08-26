import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { minimapExcludedObjects } from '../../context/MinimapViewportState';

/**
 * Wrap scene objects that should NOT appear in the minimap's top-down 3D view
 * (ships, combat effects, particles). The MinimapViewportRenderer hides these
 * groups during its render pass.
 */
export default function MinimapExclude({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    minimapExcludedObjects.add(group);
    return () => {
      minimapExcludedObjects.delete(group);
    };
  }, []);

  return <group ref={groupRef}>{children}</group>;
}
