import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
  Noise,
  HueSaturation,
} from '@react-three/postprocessing';
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
      {/*<DepthOfField ref={dofRef} focalLength={402} bokehScale={0.1} height={480} />*/}
      <Bloom
        radius={0.2}
        mipmapBlur
        luminanceThreshold={0.0}
        luminanceSmoothing={1}
        intensity={1.7}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
      <Noise opacity={0.005} />
      <HueSaturation saturation={-0.2} />
    </EffectComposer>
  );
}
