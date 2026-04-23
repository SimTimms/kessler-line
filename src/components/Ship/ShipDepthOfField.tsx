import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { radiationExposureRef } from '../../context/RadiationScan';
import { getGraphicsSettings } from '../../context/GraphicsState';
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing';
import { BlendFunction, NoiseEffect } from 'postprocessing';

const NOISE_BASE = 0.005;
const NOISE_MAX = 0.25;

export function ShipDepthOfField() {
  const noiseEffect = useMemo(() => new NoiseEffect({ blendFunction: BlendFunction.NORMAL }), []);
  const bloomEnabled = getGraphicsSettings().bloomEnabled;

  useFrame(() => {
    noiseEffect.blendMode.opacity.value =
      NOISE_BASE + radiationExposureRef.current * (NOISE_MAX - NOISE_BASE);
  });

  return (
    <EffectComposer>
      {bloomEnabled && (
        <Bloom
          radius={0.02}
          mipmapBlur
          luminanceThreshold={0.0}
          luminanceSmoothing={0.8}
          intensity={1}
        />
      )}
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
      <primitive object={noiseEffect} />
      <HueSaturation saturation={-0.2} />
    </EffectComposer>
  );
}
