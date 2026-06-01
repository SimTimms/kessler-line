import type { TutorialKeyHint } from '../TutorialMovement/tutorialMovementSteps';

export type CompletionCriteria =
  | { type: 'continue' }
  | { type: 'keydown'; codes: string[] }
  | { type: 'event'; name: string }
  | { type: 'mouseOrbit' }
  | { type: 'mouseScroll' }
  | { type: 'speed'; min: number }
  | { type: 'angular'; min: number }
  | { type: 'all'; criteria: CompletionCriteria[] };

export interface TutorialStep {
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
