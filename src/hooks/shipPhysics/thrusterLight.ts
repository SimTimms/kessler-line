import * as THREE from 'three';
import type { RefObject } from 'react';
import { thrustMultiplier } from '../../context/ShipState';

interface ThrusterLightParams {
  thrusterLightIntensity: { current: number };
  thrusterLightRef: RefObject<THREE.PointLight>;
  anyThrusting: boolean;
  dt: number;
}

export function updateThrusterLight({
  thrusterLightIntensity,
  thrusterLightRef,
  anyThrusting,
  dt,
}: ThrusterLightParams) {
  const targetIntensity = anyThrusting ? 400 * thrustMultiplier.current : 0;
  thrusterLightIntensity.current = THREE.MathUtils.lerp(
    thrusterLightIntensity.current,
    targetIntensity,
    dt * 20
  );
  if (thrusterLightRef.current) {
    thrusterLightRef.current.intensity = thrusterLightIntensity.current;
  }
}
