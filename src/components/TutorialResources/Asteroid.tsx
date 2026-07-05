import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import type { ScannableSignature } from '../../config/scannableSignature';
import { useRegisterRadioBroadcast } from '../../hooks/useRegisterRadioBroadcast';
import { useRegisterSettlement } from '../../hooks/useRegisterSettlement';
import { useScannableRegistration } from '../../hooks/useScannableRegistration';
import type { DockConfig } from '../../config/dockConfig';
import DockingBay from '../WorldObjects/DockingBay';

const OBJECT_ID = 'mineral-asteroid';
const MAGNET_LABEL = 'Iron Raw';
const OBJECT_LABEL = 'AST-47718';

export interface AsteroidProps extends ScannableSignature {
  scale?: number;
  id?: string;
  label?: string;
  /** When set, registers this asteroid as an in-scene radio contact. */
  radioBroadcast?: RadioBroadcastDef;
  /** Per-dock config for the attached docking bay (resources, contacts, job board). */
  dock?: DockConfig;
}

export function Asteroid({
  scale = 1,
  id = OBJECT_ID,
  label = OBJECT_LABEL,
  scannable = true,
  magnet = { label: MAGNET_LABEL },
  proximity = true,
  radioBroadcast,
  dock,
}: AsteroidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/asteroid_with_minerals.glb') as unknown as { scene: THREE.Group };

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
    <group ref={groupRef} position={[0, -0.88 * scale, 0]}>
      <primitive object={gltf.scene} scale={scale} position={[0, 0, 0]} />
      {dock && (
        <group position={[-276, 883, -50]} rotation={[0, Math.PI * 0.43, 0]}>
          <DockingBay
            stationId="asteroid-dock"
            dimensions={new THREE.Vector3(50, 10, 0.1)}
            dock={dock}
          />
        </group>
      )}
    </group>
  );
}
