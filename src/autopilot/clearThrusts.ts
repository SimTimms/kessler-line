export function clearThrusts(
  autopilotThrustForward: { current: boolean },
  autopilotThrustReverse: { current: boolean },
  autopilotYawLeft: { current: boolean },
  autopilotYawRight: { current: boolean }
) {
  autopilotThrustForward.current = false;
  autopilotThrustReverse.current = false;
  autopilotYawLeft.current = false;
  autopilotYawRight.current = false;
}
