import { useMemo } from 'react';
import * as THREE from 'three';
import { MAIN_ENGINE_HIT_RADIUS, MAIN_ENGINE_LOCAL_POS } from '../../context/ShipState';

interface ThrusterHitboxDebugProps {
  enabled?: boolean;
}

export default function ThrusterHitboxDebug({ enabled = true }: ThrusterHitboxDebugProps) {
  const geometry = useMemo(() => new THREE.SphereGeometry(MAIN_ENGINE_HIT_RADIUS, 16, 12), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xff8800,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    []
  );

  if (!enabled) return null;

  return (
    <group>
      <mesh geometry={geometry} material={material} position={MAIN_ENGINE_LOCAL_POS.reverseA} />
      <mesh geometry={geometry} material={material} position={MAIN_ENGINE_LOCAL_POS.reverseB} />
    </group>
  );
}
