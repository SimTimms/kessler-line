import {
  KEY_UNDOCK_CARGO,
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  displayLabelForKeyCode,
} from '../config/keybindings';

const K = displayLabelForKeyCode;

export interface TutorialStep {
  id: string;
  title: string;
  prompt: string;
  keys: string[];
  requiresContinue?: boolean;
  continueLabel?: string;
  detail?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome Aboard',
    prompt:
      "Hi, welcome to Daedalus. I'm Phil, your invigilator. Going to take you through some of the basics today.",
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'orbit-preamble',
    title: 'Lunar Orbit',
    prompt:
      "As you may have noticed, Daedalus is orbiting lunar. You're currently docked and traveling with Daedalus, but things will get more complicated once you're undocked. I'm here to guide you through this.",
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'undock',
    title: 'Undock From Daedalus',
    prompt: `Press ${K(
      KEY_UNDOCK_CARGO
    )} to release the docking clamp. You'll get a small separation push, and from that moment your path diverges from Daedalus.`,
    keys: [K(KEY_UNDOCK_CARGO)],
  },
  {
    id: 'trajectory-lesson',
    title: 'Trajectory Matters',
    prompt:
      'In orbit, tiny changes in speed or direction compound quickly. A small push now can become a major trajectory change later.',
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'thrust',
    title: 'Main Thrusters',
    prompt: `Press ${K(KEY_THRUST_FORWARD)} to engage your main thrusters and accelerate forward.`,
    keys: [K(KEY_THRUST_FORWARD)],
  },
  {
    id: 'yaw',
    title: 'Yaw Control',
    prompt: `Press ${K(KEY_YAW_LEFT)} or ${K(KEY_YAW_RIGHT)} to rotate your ship left or right.`,
    keys: [K(KEY_YAW_LEFT), K(KEY_YAW_RIGHT)],
  },
  {
    id: 'brake',
    title: 'Retro Burn',
    prompt: `Build up speed with ${K(KEY_THRUST_FORWARD)}, then press ${K(KEY_THRUST_REVERSE)} to brake.`,
    keys: [K(KEY_THRUST_REVERSE)],
    detail: 'Retro thrusters cancel your forward momentum.',
  },
  {
    id: 'strafe',
    title: 'Lateral Thrusters',
    prompt: `Press ${K(KEY_STRAFE_LEFT)} or ${K(KEY_STRAFE_RIGHT)} to strafe sideways without turning.`,
    keys: [K(KEY_STRAFE_LEFT), K(KEY_STRAFE_RIGHT)],
  },
  {
    id: 'inertia-briefing',
    title: 'Momentum Discipline',
    prompt:
      'Out here, motion follows action and reaction. Every maneuver you make must be countered if you want to regain control.',
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'counter-burn-briefing',
    title: 'Counter-Burn Early',
    prompt:
      'If you burn forward, plan your reverse burn early or you will keep accelerating along that vector. The same applies to rotation: stop input does not stop spin — apply thrust in the opposite direction to cancel it.',
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'momentum-assist-intro',
    title: 'Momentum Assist',
    prompt:
      'Lucky for you, there is a fast way to kill drift. Hold opposite control pairs together and your ship will auto-counter the motion on that axis.',
    keys: [],
    requiresContinue: true,
    continueLabel: 'Continue',
  },
  {
    id: 'momentum-assist-controls',
    title: 'Quick Cancel Controls',
    prompt: `Hold ${K(KEY_THRUST_FORWARD)} + ${K(KEY_THRUST_REVERSE)} to cancel forward/back momentum. Hold ${K(
      KEY_YAW_LEFT
    )} + ${K(KEY_YAW_RIGHT)} to cancel yaw rotation. Hold ${K(KEY_STRAFE_LEFT)} + ${K(
      KEY_STRAFE_RIGHT
    )} to cancel lateral drift.`,
    keys: [
      K(KEY_THRUST_FORWARD),
      K(KEY_THRUST_REVERSE),
      K(KEY_YAW_LEFT),
      K(KEY_YAW_RIGHT),
      K(KEY_STRAFE_LEFT),
      K(KEY_STRAFE_RIGHT),
    ],
    requiresContinue: true,
    continueLabel: 'Finish Tutorial',
  },
];
