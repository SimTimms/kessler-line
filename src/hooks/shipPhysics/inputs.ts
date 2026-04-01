import type { MutableRefObject } from 'react';
import {
  cinematicThrustForward,
  cinematicThrustReverse,
  mobileThrustForward,
  mobileThrustLeft,
  mobileThrustReverse,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
  mobileThrustRadialOut,
  mobileThrustRadialIn,
} from '../../context/ShipState';
import {
  autopilotThrustForward,
  autopilotThrustReverse,
  autopilotYawLeft,
  autopilotYawRight,
  autopilotRadialOut,
  autopilotRadialIn,
} from '../../context/AutopilotState';

export interface ThrustInputRefs {
  thrustForward: MutableRefObject<boolean>;
  thrustReverse: MutableRefObject<boolean>;
  thrustLeft: MutableRefObject<boolean>;
  thrustRight: MutableRefObject<boolean>;
  thrustStrafeLeft: MutableRefObject<boolean>;
  thrustStrafeRight: MutableRefObject<boolean>;
  thrustRadialOut: MutableRefObject<boolean>;
  thrustRadialIn: MutableRefObject<boolean>;
}

export function getManualInput(refs: ThrustInputRefs): boolean {
  return (
    refs.thrustForward.current ||
    refs.thrustReverse.current ||
    refs.thrustLeft.current ||
    refs.thrustRight.current ||
    refs.thrustStrafeLeft.current ||
    refs.thrustStrafeRight.current ||
    refs.thrustRadialOut.current ||
    refs.thrustRadialIn.current ||
    mobileThrustForward.current ||
    mobileThrustReverse.current ||
    mobileThrustLeft.current ||
    mobileThrustRight.current ||
    mobileThrustStrafeLeft.current ||
    mobileThrustStrafeRight.current
  );
}

export function getCombinedInputs(refs: ThrustInputRefs) {
  const yawLeft = refs.thrustLeft.current || mobileThrustLeft.current || autopilotYawLeft.current;
  const yawRight =
    refs.thrustRight.current || mobileThrustRight.current || autopilotYawRight.current;
  const fwd =
    refs.thrustForward.current ||
    mobileThrustForward.current ||
    cinematicThrustForward.current ||
    autopilotThrustForward.current;
  const rev =
    refs.thrustReverse.current ||
    mobileThrustReverse.current ||
    cinematicThrustReverse.current ||
    autopilotThrustReverse.current;
  const strL = refs.thrustStrafeLeft.current || mobileThrustStrafeLeft.current;
  const strR = refs.thrustStrafeRight.current || mobileThrustStrafeRight.current;
  const radOut = refs.thrustRadialOut.current || mobileThrustRadialOut.current || autopilotRadialOut.current;
  const radIn = refs.thrustRadialIn.current || mobileThrustRadialIn.current || autopilotRadialIn.current;

  return { yawLeft, yawRight, fwd, rev, strL, strR, radOut, radIn };
}
