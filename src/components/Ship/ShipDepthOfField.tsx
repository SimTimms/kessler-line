import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';

export function ShipDepthOfField({ shipPosRef }: { shipPosRef: { current: THREE.Vector3 } }) {
  const dofRef = useRef<DepthOfFieldEffect>(null!);

  useFrame(() => {
    if (dofRef.current) {
      dofRef.current.target = shipPosRef.current;
    }
  });

  return (
    <EffectComposer>
      <DepthOfField ref={dofRef} focalLength={402} bokehScale={0.1} height={480} />
    </EffectComposer>
  );
}
