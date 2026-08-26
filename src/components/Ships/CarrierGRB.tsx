/**
 * Type-04 Aircraft Carrier "GRB"
 *
 * Loads the Type-004 aircraft carrier GLB model.
 */

import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/type-004_aircraft_carrier.glb';

interface CarrierGRBProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export default function CarrierGRB({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: CarrierGRBProps) {
  const { scene: modelScene } = useGLTF(MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={modelScene} scale={scale} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
