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
} from '../../context/ShipState';
import {
  autopilotThrustForward,
  autopilotThrustReverse,
  autopilotYawLeft,
  autopilotYawRight,
} from '../../context/AutopilotState';

export interface ThrustInputRefs {
  thrustForward: MutableRefObject<boolean>;
  thrustReverse: MutableRefObject<boolean>;
  thrustLeft: MutableRefObject<boolean>;
  thrustRight: MutableRefObject<boolean>;
  thrustStrafeLeft: MutableRefObject<boolean>;
  thrustStrafeRight: MutableRefObject<boolean>;
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

  return { yawLeft, yawRight, fwd, rev, strL, strR };
}
