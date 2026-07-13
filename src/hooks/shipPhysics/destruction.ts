import * as THREE from 'three';
import { cinematicAutopilotActive } from '../../context/CinematicState';
import { radiationExposureRef } from '../../context/RadiationScan';
import {
  setVesselHullIntegrity,
  type VesselRuntimeState,
} from '../../context/VesselStateStore';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { setHullIntegrity } from '../../context/ShipState';

export function triggerShipDestruction({
  vesselId,
  vesselState,
  cause,
  cinematicThrustForwardRef,
  cinematicThrustReverseRef,
}: {
  vesselId: string;
  vesselState: VesselRuntimeState;
  cause: string;
  cinematicThrustForwardRef?: { current: boolean };
  cinematicThrustReverseRef?: { current: boolean };
}) {
  if (vesselState.shipDestroyed.current) return;
  vesselState.shipDestroyed.current = true;
  if (vesselId === PLAYER_VESSEL_ID) {
    setHullIntegrity(0);
  } else {
    setVesselHullIntegrity(vesselId, 0);
  }
  cinematicAutopilotActive.current = false;
  if (cinematicThrustForwardRef) cinematicThrustForwardRef.current = false;
  if (cinematicThrustReverseRef) cinematicThrustReverseRef.current = false;
  window.dispatchEvent(new CustomEvent('ShipDestroyed', { detail: { cause, vesselId } }));
}

export function checkShipDestruction({
  vesselId,
  vesselState,
  destroyedFired,
  destroyedSpinSet,
  angularVelocity,
  angularVelocity3,
  thrustForward,
  thrustReverse,
  thrustLeft,
  thrustRight,
  thrustStrafeLeft,
  thrustStrafeRight,
  thrustRadialOut,
  thrustRadialIn,
  cinematicThrustForwardRef,
  cinematicThrustReverseRef,
}: {
  vesselId: string;
  vesselState: VesselRuntimeState;
  destroyedFired: React.MutableRefObject<boolean>;
  destroyedSpinSet: React.MutableRefObject<boolean>;
  angularVelocity: React.MutableRefObject<number>;
  angularVelocity3: React.MutableRefObject<THREE.Vector3>;
  thrustForward: React.MutableRefObject<boolean>;
  thrustReverse: React.MutableRefObject<boolean>;
  thrustLeft: React.MutableRefObject<boolean>;
  thrustRight: React.MutableRefObject<boolean>;
  thrustStrafeLeft: React.MutableRefObject<boolean>;
  thrustStrafeRight: React.MutableRefObject<boolean>;
  thrustRadialOut: React.MutableRefObject<boolean>;
  thrustRadialIn: React.MutableRefObject<boolean>;
  cinematicThrustForwardRef?: { current: boolean };
  cinematicThrustReverseRef?: { current: boolean };
}): void {
  if (vesselState.hullIntegrity <= 0 && !destroyedFired.current) {
    destroyedFired.current = true;
    const cause = radiationExposureRef.current > 0 ? 'radiation' : 'hull';
    triggerShipDestruction({
      vesselId,
      vesselState,
      cause,
      cinematicThrustForwardRef,
      cinematicThrustReverseRef,
    });
    thrustForward.current = false;
    thrustReverse.current = false;
    thrustLeft.current = false;
    thrustRight.current = false;
    thrustStrafeLeft.current = false;
    thrustStrafeRight.current = false;
    thrustRadialOut.current = false;
    thrustRadialIn.current = false;
    vesselState.mainEngineDisabled.reverseA.current = true;
    vesselState.mainEngineDisabled.reverseB.current = true;
    if (!destroyedSpinSet.current) {
      destroyedSpinSet.current = true;
      angularVelocity.current += (Math.random() < 0.5 ? -1 : 1) * 0.9;
      angularVelocity3.current.set(
        (Math.random() * 2 - 1) * 0.6,
        0,
        (Math.random() * 2 - 1) * 0.6
      );
    }
  }
}
