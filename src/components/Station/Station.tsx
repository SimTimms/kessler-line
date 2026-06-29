import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import type { ScannableSignature } from '../../config/scannableSignature';
import { useRegisterRadioBroadcast } from '../../hooks/useRegisterRadioBroadcast';
import { useRegisterSettlement } from '../../hooks/useRegisterSettlement';
import { useScannableRegistration } from '../../hooks/useScannableRegistration';

const OBJECT_ID = 'OPS-Station';
const MAGNET_LABEL = 'Steel | Iron | Composite';
const OBJECT_LABEL = 'OPS Depot';

export interface StationProps extends ScannableSignature {
  scale?: number;
  id?: string;
  label?: string;
  /** When set, registers this asteroid as an in-scene radio contact. */
  radioBroadcast?: RadioBroadcastDef;
}

export function Station({
  scale = 1,
  id = OBJECT_ID,
  label = OBJECT_LABEL,
  scannable = true,
  magnet = { label: MAGNET_LABEL },
  proximity = true,
  radioBroadcast,
}: StationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/station-two.glb') as unknown as { scene: THREE.Group };

  useRegisterRadioBroadcast(groupRef, radioBroadcast);
  useRegisterSettlement(id);

  const proximityShape = useMemo(() => ({ type: 'sphere' as const, radius: 120 }), []);

  useScannableRegistration({
    id,
    label,
    groupRef,
    scannable,
    magnet,
    proximity,
    proximityShape,
  });

  return (
    <group ref={groupRef} position={[0, -20.88 * scale, 0]}>
      <primitive object={gltf.scene} scale={scale} position={[0, 0, 0]} />
    </group>
  );
}
