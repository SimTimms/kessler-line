import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  floatingOriginActiveRef,
  floatingOriginOffsetRef,
} from '../../context/FloatingOrigin';

type FocusRef = { current: THREE.Vector3 };

export interface FloatingOriginProps {
  children: ReactNode;
  /** Simulation-space world position to rebase near each frame (default: ship). */
  focus?: FocusRef;
  /**
   * Run after orbit + dock sync (shipPosRef) and before the follow camera.
   * @default 3
   */
  priority?: number;
}

/**
 * Rebases all children so `focus` sits near the origin each frame, keeping GPU
 * transforms in a small numeric range. Children should continue to use
 * simulation-space coordinates as their local positions (as today).
 */
export function FloatingOrigin({
  children,
  focus = shipPosRef,
  priority = 3,
}: FloatingOriginProps) {
  const groupRef = useRef<THREE.Group>(null);

  const syncOffset = () => {
    const group = groupRef.current;
    if (!group) return;
    const f = focus.current;
    group.position.set(-f.x, -f.y, -f.z);
    floatingOriginOffsetRef.current.copy(group.position);
  };

  useLayoutEffect(() => {
    floatingOriginActiveRef.current = true;
    syncOffset();
    return () => {
      floatingOriginActiveRef.current = false;
      floatingOriginOffsetRef.current.set(0, 0, 0);
    };
  }, [focus]);

  useFrame(syncOffset, priority);

  return (
    <group ref={groupRef} name="floating-origin">
      {children}
    </group>
  );
}
