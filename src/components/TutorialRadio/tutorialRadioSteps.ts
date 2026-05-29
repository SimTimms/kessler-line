import { type CompletionCriteria } from '../TutorialShared/tutorialSharedConst';

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
  ABOUT_RADIO: 'about-radio',
  TURN_ON_RADIO: 'turn-on-radio',
};

const RADIO_CONTENT = {
  ABOUT_RADIO: `Radio is a vital resource for your ship. It's used for communication with other ships, stations and beacons. The radio is such a low power system, unless you're in dire circumstances, it's probably leaving it on. `,
  TURN_ON_RADIO: `To turn on the radio, you need to press the radio button on your HUD.`,
};

export const TUTORIAL_STEPS: TutorialResourcesStep[] = [
  {
    id: TUTORIAL_STEP_IDS.ABOUT_RADIO,
    title: 'About Radio',
    prompt: RADIO_CONTENT.ABOUT_RADIO,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.TURN_ON_RADIO,
    title: 'Turn on Radio',
    prompt: RADIO_CONTENT.TURN_ON_RADIO,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
];
