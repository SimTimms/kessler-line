import * as THREE from 'three';
import type { MutableRefObject, RefObject } from 'react';
import { thrustMultiplier } from '../../context/ShipState';
import {
  THRUSTER_LIGHT_INTENSITY_MAIN,
  THRUSTER_LIGHT_INTENSITY_RCS,
} from '../../config/shipConfig';

/** Slot order must match `Spaceship` point lights: main ×2, then RCS ×5. */
export const THRUSTER_POINT_LIGHT_COUNT = 7;

export interface ThrusterLightActives {
  reverseA: boolean;
  reverseB: boolean;
  forward: boolean;
  left: boolean;
  right: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
}

export function updateThrusterLights({
  thrusterLightIntensities,
  thrusterLightRefs,
  actives,
  dt,
}: {
  thrusterLightIntensities: MutableRefObject<number[]>;
  thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>;
  actives: ThrusterLightActives;
  dt: number;
}) {
  const m = thrustMultiplier.current;
  const targets: number[] = [
    actives.reverseA ? THRUSTER_LIGHT_INTENSITY_MAIN * m : 0,
    actives.reverseB ? THRUSTER_LIGHT_INTENSITY_MAIN * m : 0,
    actives.forward ? THRUSTER_LIGHT_INTENSITY_RCS * m : 0,
    actives.left ? THRUSTER_LIGHT_INTENSITY_RCS * m : 0,
    actives.right ? THRUSTER_LIGHT_INTENSITY_RCS * m : 0,
    actives.strafeLeft ? THRUSTER_LIGHT_INTENSITY_RCS * m : 0,
    actives.strafeRight ? THRUSTER_LIGHT_INTENSITY_RCS * m : 0,
  ];

  const intens = thrusterLightIntensities.current;
  const lights = thrusterLightRefs.current;
  if (!lights) return;

  const alpha = dt * 20;
  for (let i = 0; i < THRUSTER_POINT_LIGHT_COUNT; i++) {
    const prev = intens[i] ?? 0;
    intens[i] = THREE.MathUtils.lerp(prev, targets[i]!, alpha);
    const light = lights[i];
    if (light) light.intensity = intens[i]!;
  }
}

export function zeroThrusterLights(
  thrusterLightIntensities: MutableRefObject<number[]>,
  thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>
) {
  const intens = thrusterLightIntensities.current;
  const lights = thrusterLightRefs.current;
  for (let i = 0; i < THRUSTER_POINT_LIGHT_COUNT; i++) {
    intens[i] = 0;
    if (lights?.[i]) lights[i]!.intensity = 0;
  }
}
