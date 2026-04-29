import {
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
  detail?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
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
];
