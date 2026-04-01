import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { shipPosRef } from '../../context/ShipPos';
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
  Noise,
  HueSaturation,
} from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';

export function ShipDepthOfField() {
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
        radius={0.02}
        mipmapBlur
        luminanceThreshold={0.0}
        luminanceSmoothing={0.8}
        intensity={1}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
      <Noise opacity={0.025} />
      <HueSaturation saturation={-0.2} />
    </EffectComposer>
  );
}
