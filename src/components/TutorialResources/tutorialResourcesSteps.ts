import { type CompletionCriteria } from '../TutorialShared/tutorialSharedConst';
import {
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  KEY_STABILISER,
  displayLabelForKeyCode,
} from '../../config/keybindings';

const K = displayLabelForKeyCode;

/**
 * Criteria that determines when a tutorial step auto-advances.
 *
 * - continue      — manual Continue button only
 * - keydown       — any key in `codes` is pressed
 * - event         — a named window CustomEvent fires (e.g. 'ShipUndocked')
 * - mouseOrbit    — user holds left mouse button and drags past a movement threshold
 * - mouseScroll   — user turns the scroll wheel at least once
 * - speed         — ship speed exceeds `min` (m/s) at least once
 * - angular       — ship angular velocity exceeds `min` at least once
 * - all           — every sub-criterion in `criteria` must be met (AND gate)
 */

/** Visual hints under the prompt (key-cap icons, mouse, scroll). Prefer over plain `keys` when set. */
export type TutorialKeyHint =
  | { kind: 'keyboard'; code: string }
  | { kind: 'mouseLeft' }
  | { kind: 'mouseMove' }
  | { kind: 'scrollWheel' };

export interface TutorialResourcesStep {
  id: string;
  title: string;
  prompt: string;
  keys: string[];
  /** Rich icons for the control strip — keyboard caps, mouse buttons, scroll. */
  keyHints?: TutorialKeyHint[];
  /** When present, drives step advancement in TutorialStepWatcher. */
  completionCriteria?: CompletionCriteria;
  /** Legacy flag for docking steps — shows the Continue button without criteria. */
  requiresContinue?: boolean;
  continueLabel?: string;
  detail?: string;
}

export const TUTORIAL_STEP_IDS = {
  WELCOME: 'welcome',
  RESOURCES: 'resources',
  AIR: 'air',
  PROPELLENT: 'propellant',
  POWER: 'power',
  SCANNERS: 'scanners',
  MAGNETIC_SCAN: 'magnetic-scan',
  DRIVE_SIGNATURE: 'drive-signature',
  PROXIMITY: 'proximity',
  RADIO: 'radio',
  RADIATION: 'radiation',
  NAV_HUD: 'nav-hud',
  NAV_TARGET: 'nav-target',
  AUTOPILOT: 'autopilot',
};

export const TUTORIAL_STEPS: TutorialResourcesStep[] = [
  {
    id: TUTORIAL_STEP_IDS.RESOURCES,
    title: 'Resources',
    prompt: `All ships have limited resources, fuel, air, water and power. You need to manage these resources carefully to keep your ship alive. `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.AIR,
    title: 'Air Control',
    prompt: `All crew members use air. If you run out, you'll pass out and die. The more crew you have, the more air you're going to use.  `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.PROPELLENT,
    title: 'Propellant',
    prompt: `Propellant is used to power your ship's engines. You need to manage your propellant carefully to keep your ship moving.  `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.POWER,
    title: 'Power',
    prompt: `Power is used to power your ship's systems. You need to manage your power carefully to use your scanners and other systems.  `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.SCANNERS,
    title: 'Scanners',
    prompt: `You can use the scanners to scan the area for resources and dangers. Scanners use power and they have variable range depending on how much power you assign to each one. UsePower sparingly, but it's a good idea to have at least some scanners on at all times.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.MAGNETIC_SCAN,
    title: 'Magnetic Scan',
    prompt: `You can use the magnetic scanner to scan the area for metalic objects. Turn on the magnetic scanner and you'll see anything metallic within range will appear on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.DRIVE_SIGNATURE,
    title: 'Drive Signature',
    prompt: `You can use the drive signature scanner to scan the area for other ships. Turn on the drive signature scanner and you'll see any other ships within range will appear on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.PROXIMITY,
    title: 'Proximity Scan',
    prompt: `You can use the proximity scanner to scan for solid objects. Proximity Scanner is very important to help you avoid potentially unseen objects in space.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.RADIO,
    title: 'Radio',
    prompt: `You can use the radio to communicate with other ships. Turn on the radio and you'll be able to hear other ships within range.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.RADIATION,
    title: 'Radiation',
    prompt: `You can use the radiation scanner to scan the area for radiation. Radiation is a danger to your crew and can be fatal if you're not careful. Turn on the radiation scanner and you'll see any radiation within range will appear on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.NAV_HUD,
    title: 'Nav HUD',
    prompt: `You can use the nav HUD to navigate to your target. Turn on the nav HUD and you'll see your target on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.NAV_TARGET,
    title: 'Nav Target',
    prompt: `You can use the nav target to navigate to your target. Turn on the nav target and you'll see your target on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.AUTOPILOT,
    title: 'Autopilot',
    prompt: `You can use the autopilot to navigate to your target. Turn on the autopilot and you'll see your target on your HUD.    `,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
];
