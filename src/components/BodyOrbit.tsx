import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useBodyOrbit } from '../hooks/useBodyOrbit';
import type { BodyOrbitParams } from '../utils/bodyOrbit';

type BodyOrbitProps = BodyOrbitParams & {
  children: ReactNode;
};

/** Kinematic circular orbit wrapper — use for any child that should circle a planet or the Sun. */
export function BodyOrbit({ children, ...orbitParams }: BodyOrbitProps) {
  const groupRef = useRef<THREE.Group>(null);
  useBodyOrbit(groupRef, orbitParams);

  return <group ref={groupRef}>{children}</group>;
}
 