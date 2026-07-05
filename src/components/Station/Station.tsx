import { useMemo, useRef, type RefObject } from 'react';
import { useGLTF, useHelper } from '@react-three/drei';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import type { ScannableSignature } from '../../config/scannableSignature';
import { useRegisterRadioBroadcast } from '../../hooks/useRegisterRadioBroadcast';
import { useRegisterSettlement } from '../../hooks/useRegisterSettlement';
import { useScannableRegistration } from '../../hooks/useScannableRegistration';
import StationDrones from '../StationDrones/StationDrones';
import DustCloud from '../DustCloud/DustCloud';

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
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const gltf = useGLTF('/station-two.glb') as unknown as { scene: THREE.Group };

  useHelper(spotLightRef as RefObject<THREE.Object3D>, THREE.SpotLightHelper, '#ffff00');

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
      <StationDrones center={[26, 10020, -6.8]} />
      <DustCloud
        yInitial={5000}
        radius={2000}
        particleSize={15000}
        radialSpread={20002}
        colors={[new THREE.Color('#ff7661')]}
        opacity={0.05}
      />
      <primitive object={gltf.scene} scale={scale} position={[0, 0, 0]} />
    </group>
  );
}
