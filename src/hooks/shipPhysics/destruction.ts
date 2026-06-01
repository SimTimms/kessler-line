import * as THREE from 'three';
import {
  hullIntegrity,
  setHullIntegrity,
  shipDestroyed,
  mainEngineDisabled,
  cinematicThrustForward,
  cinematicThrustReverse,
} from '../../context/ShipState';
import { cinematicAutopilotActive } from '../../context/CinematicState';
import { radiationExposureRef } from '../../context/RadiationScan';

export function triggerShipDestruction(cause: string) {
  if (shipDestroyed.current) return;
  shipDestroyed.current = true;
  setHullIntegrity(0);
  cinematicAutopilotActive.current = false;
  cinematicThrustForward.current = false;
  cinematicThrustReverse.current = false;
  window.dispatchEvent(new CustomEvent('ShipDestroyed', { detail: { cause } }));
}

export function checkShipDestruction({
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
}: {
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
}): void {
  if (hullIntegrity <= 0 && !destroyedFired.current) {
    destroyedFired.current = true;
    const cause = radiationExposureRef.current > 0 ? 'radiation' : 'hull';
    triggerShipDestruction(cause);
    thrustForward.current = false;
    thrustReverse.current = false;
    thrustLeft.current = false;
    thrustRight.current = false;
    thrustStrafeLeft.current = false;
    thrustStrafeRight.current = false;
    thrustRadialOut.current = false;
    thrustRadialIn.current = false;
    mainEngineDisabled.reverseA.current = true;
    mainEngineDisabled.reverseB.current = true;
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
