export type AutopilotPhase =
  | 'idle'
  | 'align'
  | 'burn'
  | 'hyperbolic-approach'
  | 'coast-to-periapsis'
  | 'hyperbolic-capture'
  | 'retroburn'
  | 'circularize'
  | 'stabilize-orbit'
  | 'done';

export const autopilotActive = { current: false };
export const autopilotPhase: { current: AutopilotPhase } = { current: 'idle' };
export const autopilotStatus = { current: 'ENGAGED' }; // human-readable label shown in NavHUD

// Thrust outputs consumed by getCombinedInputs each frame
export const autopilotThrustForward = { current: false };
export const autopilotThrustReverse = { current: false };
export const autopilotYawLeft = { current: false };
export const autopilotYawRight = { current: false };
export const autopilotRadialOut = { current: false };
export const autopilotRadialIn = { current: false };

export function enableAutopilot() {
  autopilotActive.current = true;
  const audio = new Audio('hyperbolic.mp3');
  audio.play().catch(() => {});
  autopilotPhase.current = 'hyperbolic-approach'; // DEBUG: skip align
}

export function disableAutopilot() {
  autopilotActive.current = false;
  autopilotPhase.current = 'idle';
  autopilotThrustForward.current = false;
  autopilotThrustReverse.current = false;
  autopilotYawLeft.current = false;
  autopilotYawRight.current = false;
  autopilotRadialOut.current = false;
  autopilotRadialIn.current = false;
}
