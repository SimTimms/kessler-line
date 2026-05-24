import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import {
  useRegisterWorldObject,
  type WorldObjectRegistrationConfig,
} from '../../hooks/useRegisterWorldObject';

type GroupProps = JSX.IntrinsicElements['group'];

interface WorldObjectRegistrationProps extends GroupProps {
  config: WorldObjectRegistrationConfig;
  children: ReactNode;
}

/** Wraps children in a group and registers them with scanner/collision systems. */
export default function WorldObjectRegistration({
  config,
  children,
  ...groupProps
}: WorldObjectRegistrationProps) {
  const groupRef = useRef<THREE.Group>(null);
  useRegisterWorldObject(groupRef, config);

  return (
    <group ref={groupRef} {...groupProps}>
      {children}
    </group>
  );
}
