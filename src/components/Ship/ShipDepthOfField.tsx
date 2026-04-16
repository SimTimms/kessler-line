import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { shipPosRef } from '../../context/ShipPos';
import { radiationExposureRef } from '../../context/RadiationScan';
import { getGraphicsSettings } from '../../context/GraphicsState';
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  HueSaturation,
} from '@react-three/postprocessing';
import type { NoiseEffect } from 'postprocessing';

const NOISE_BASE = 0.025;
const NOISE_MAX = 0.25;

export function ShipDepthOfField() {
  const noiseRef = useRef<NoiseEffect>(null!);
  const bloomEnabled = getGraphicsSettings().bloomEnabled;

  useFrame(() => {
    if (noiseRef.current) {
      noiseRef.current.blendMode.opacity.value =
        NOISE_BASE + radiationExposureRef.current * (NOISE_MAX - NOISE_BASE);
    }
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
      <Noise ref={noiseRef} opacity={0.025} />
      <HueSaturation saturation={-0.2} />
    </EffectComposer>
  );
}
