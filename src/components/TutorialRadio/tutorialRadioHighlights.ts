import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { TUTORIAL_STEP_IDS } from './tutorialRadioSteps';

export function highlightedHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    case TUTORIAL_STEP_IDS.TURN_ON_RADIO:
      return [ScannerHUDElements.RADIO];

    default:
      return [];
  }
}

export function disabledHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    default:
      return [];
  }
}
