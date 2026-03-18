export function clearThrusts(
  autopilotThrustForward: { current: boolean },
  autopilotThrustReverse: { current: boolean },
  autopilotYawLeft: { current: boolean },
  autopilotYawRight: { current: boolean },
  autopilotRadialOut: { current: boolean },
  autopilotRadialIn: { current: boolean }
) {
  autopilotThrustForward.current = false;
  autopilotThrustReverse.current = false;
  autopilotYawLeft.current = false;
  autopilotYawRight.current = false;
  autopilotRadialOut.current = false;
  autopilotRadialIn.current = false;
}
