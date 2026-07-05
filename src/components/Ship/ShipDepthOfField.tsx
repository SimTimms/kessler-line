import { useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { radiationExposureRef } from '../../context/RadiationScan';
import { shipPosRef } from '../../context/ShipPos';
import {
  floatingOriginActiveRef,
  simulationToRenderSpace,
} from '../../context/FloatingOrigin';
import { EffectComposer, Bloom, HueSaturation } from '@react-three/postprocessing';
import { BlendFunction, NoiseEffect, DepthOfFieldEffect } from 'postprocessing';

const NOISE_BASE = 0.00005;
const NOISE_MAX = 0.25;

interface ShipDepthOfFieldProps {
  saturation?: number;
}
export function ShipDepthOfField({ saturation }: ShipDepthOfFieldProps) {
  const { camera } = useThree();
  const noiseEffect = useMemo(() => new NoiseEffect({ blendFunction: BlendFunction.NORMAL }), []);
  // target is updated each frame so the focal plane always sits on the ship
  const dofEffect = useMemo(
    () => new DepthOfFieldEffect(camera, { focusDistance: 70, focusRange: 100, bokehScale: 2 }),
    [camera]
  );
  const bloomEnabled = false; //getGraphicsSettings().bloomEnabled;
  const dofTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    noiseEffect.blendMode.opacity.value =
      NOISE_BASE + radiationExposureRef.current * (NOISE_MAX - NOISE_BASE);
    if (floatingOriginActiveRef.current) {
      simulationToRenderSpace(shipPosRef.current, dofTarget.current);
    } else {
      dofTarget.current.copy(shipPosRef.current);
    }
    dofEffect.target = dofTarget.current;
  });

  return (
    <EffectComposer>
      <Bloom
        enabled={bloomEnabled}
        radius={0.0002}
        mipmapBlur
        luminanceThreshold={0.0}
        luminanceSmoothing={0.8}
        intensity={0.3}
      />
      <HueSaturation saturation={saturation ?? -1} />
    </EffectComposer>
  );
}
