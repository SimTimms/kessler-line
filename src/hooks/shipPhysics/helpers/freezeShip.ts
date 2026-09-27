import type { RefObject } from 'react';
import * as THREE from 'three';
import { type VesselRuntimeState } from '../../../context/VesselStateStore';

interface FreezeShipParams {
  didApplyInitialVelocity: RefObject<boolean>;
  velocity: RefObject<THREE.Vector3>;
  angularVelocity: RefObject<number>;
  updateEngineAudio: (audio: any) => void;
  zeroThrusterLights: (
    thrusterLightIntensities: RefObject<number[]>,
    thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>
  ) => void;
  vesselState: VesselRuntimeState;
  thrusterLightIntensities: RefObject<number[]>;
  thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>;
}
export function freezeShipFunction({
  didApplyInitialVelocity,
  velocity,
  angularVelocity,
  updateEngineAudio,
  zeroThrusterLights,
  vesselState,
  thrusterLightIntensities,
  thrusterLightRefs,
}: FreezeShipParams) {
  didApplyInitialVelocity.current = true;
  velocity.current.set(0, 0, 0);
  angularVelocity.current = 0;
  updateEngineAudio({ mainThrust: false, rcsThrust: false, fwdThrust: false });
  zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
  vesselState.shipAcceleration.current = 0;
  vesselState.shipVelocity.set(0, 0, 0);
  vesselState.effectiveThrustFwd.current = false;
  vesselState.effectiveThrustRev.current = false;
  vesselState.effectiveYawLeft.current = false;
  vesselState.effectiveYawRight.current = false;
  vesselState.effectiveThrustStrL.current = false;
  vesselState.effectiveThrustStrR.current = false;
  vesselState.shipAngularVelocity.current = 0;
}
