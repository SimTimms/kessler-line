import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { shipPosRef } from '../../context/ShipPos';
import { radiationExposureRef } from '../../context/RadiationScan';
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
  Noise,
  HueSaturation,
} from '@react-three/postprocessing';
import type { DepthOfFieldEffect, NoiseEffect } from 'postprocessing';

const NOISE_BASE = 0.025;
const NOISE_MAX = 0.25;

export function ShipDepthOfField() {
  const dofRef = useRef<DepthOfFieldEffect>(null!);
  const noiseRef = useRef<NoiseEffect>(null!);

  useFrame(() => {
    if (dofRef.current) {
      dofRef.current.target = shipPosRef.current;
    }
    if (noiseRef.current) {
      noiseRef.current.blendMode.opacity.value =
        NOISE_BASE + radiationExposureRef.current * (NOISE_MAX - NOISE_BASE);
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
      <Noise ref={noiseRef} opacity={0.025} />
      <HueSaturation saturation={-0.2} />
    </EffectComposer>
  );
}
