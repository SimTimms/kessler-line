import { type CompletionCriteria } from '../TutorialShared/tutorialSharedConst';

export type TutorialKeyHint =
  | { kind: 'keyboard'; code: string }
  | { kind: 'mouseLeft' }
  | { kind: 'mouseMove' }
  | { kind: 'scrollWheel' };

export interface TutorialStep {
  id: string;
  title: string;
  prompt: string;
  keys: string[];
  keyHints?: TutorialKeyHint[];
  completionCriteria?: CompletionCriteria;
  requiresContinue?: boolean;
  continueLabel?: string;
  detail?: string;
}

export const TUTORIAL_STEP_IDS = {
  WELCOME: 'welcome',
};

const ORBITAL_CONTENT = {
  WELCOME: `Radio is a vital resource for your ship. It's used for communication with other ships, stations and beacons. The radio is such a low power system, unless you're in dire circumstances, it's probably leaving it on. `,
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: TUTORIAL_STEP_IDS.WELCOME,
    title: 'Welcome',
    prompt: ORBITAL_CONTENT.WELCOME,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
];
