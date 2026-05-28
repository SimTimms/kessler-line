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
  ABOUT_AIR: 'about-air',
  CREW_USAGE: 'crew-usage',
  ADDING_CREW: 'adding-crew',
  SPACING_CREW: 'spacing-crew',
  FINDING_AIR: 'finding-air',
  GETTING_AIR: 'getting-air',
  GETTING_AIR_ONE: 'getting-air-one',
  GETTING_AIR_TWO: 'getting-air-two',
  GETTING_AIR_THREE: 'getting-air-three',
  GETTING_AIR_FOUR: 'getting-air-four',
  GIVING_AIR: 'giving-air',
};

const AIR_CONTENT = {
  ABOUT_AIR: `Air is a vital resource for your ship. It's used for breathing, cooking, and other activities.`,
  CREW_USAGE: `All crew members use air. If you run out, you'll pass out and die. The more crew you have, the more air you're going to use.`,
  ADDING_CREW: `Adding crew members will increase your air usage.`,
  SPACING_CREW: `You know, in dire situations there is a way to reduce your air usage. That's by reducing your crew members. You can unload them somewhere nice, but if you can't...Well, there's always the airlock. `,
  FINDING_AIR: `Finding air is not that difficult. Look for any signs of civilization And you'll probably find some oxygen that you can either salvage or steal.  `,
  GETTING_AIR: `To get air, we need to transfer. Usually, you do this by docking, which will bring up the air dialog. `,
  GETTING_AIR_ONE: `Use your Magnet Scanner or Proximity Scanner or even your Spotlight to find man-made objects around you.  `,
  GETTING_AIR_TWO: `When you have found an object that you can dock with, Rendezvous with it and dock.  `,
  GETTING_AIR_THREE: `As you'll dock, you'll see the options for transferring fuel and power between the ship and the docked options. For this instructional, you'll want to transfer as many resources as you can to your ship. `,
  GETTING_AIR_FOUR: `Once you have transferred as many resources as you can, you can undock `,
  GIVING_AIR_THREE: `Wait for the transfer to complete. `,
};

export const TUTORIAL_STEPS: TutorialResourcesStep[] = [
  {
    id: TUTORIAL_STEP_IDS.ABOUT_AIR,
    title: 'About Air',
    prompt: AIR_CONTENT.ABOUT_AIR,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.CREW_USAGE,
    title: 'Crew Usage',
    prompt: AIR_CONTENT.CREW_USAGE,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.ADDING_CREW,
    title: 'Adding Crew',
    prompt: AIR_CONTENT.ADDING_CREW,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.SPACING_CREW,
    title: 'Spacing Crew',
    prompt: AIR_CONTENT.SPACING_CREW,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.FINDING_AIR,
    title: 'Finding Air',
    prompt: AIR_CONTENT.FINDING_AIR,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.GETTING_AIR,
    title: 'Getting Air',
    prompt: AIR_CONTENT.GETTING_AIR,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.GETTING_AIR_ONE,
    title: 'Getting Air One',
    prompt: AIR_CONTENT.GETTING_AIR_ONE,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.GETTING_AIR_TWO,
    title: 'Getting Air Two',
    prompt: AIR_CONTENT.GETTING_AIR_TWO,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.GETTING_AIR_THREE,
    title: 'Getting Air Three',
    prompt: AIR_CONTENT.GETTING_AIR_THREE,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
  {
    id: TUTORIAL_STEP_IDS.GETTING_AIR_FOUR,
    title: 'Giving Air',
    prompt: AIR_CONTENT.GETTING_AIR_FOUR,
    keys: [],
    completionCriteria: { type: 'continue' },
    continueLabel: 'Continue',
  },
];
