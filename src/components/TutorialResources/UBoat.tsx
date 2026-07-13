import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ScannableSignature } from '../../config/scannableSignature';
import { useScannableRegistration } from '../../hooks/useScannableRegistration';
import type { ShipPhysicsOptions } from '../../hooks/shipPhysics/useShipPhysics';

const UBOAT_ID = 'tutorial-uboat-ruin';
const UBOAT_LABEL = 'HMS Afridi Wreck';

export interface UBoatProps extends ScannableSignature {
  id?: string;
  label?: string;
  physicsOptions?: ShipPhysicsOptions;
}

export function UBoat({
  id = UBOAT_ID,
  label = UBOAT_LABEL,
  scannable = true,
  magnet = true,
  driveSignature = true,
  proximity = true,
  physicsOptions,
}: UBoatProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/uboat-ruin.glb') as unknown as { scene: THREE.Group };

  const proximityShape = useMemo(() => ({ type: 'sphere' as const, radius: 120 }), []);

  useScannableRegistration({
    id,
    label,
    groupRef,
    scannable,
    magnet,
    driveSignature,
    proximity,
    proximityShape,
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} scale={30} position={[0, 0, 0]} />
    </group>
  );
}
