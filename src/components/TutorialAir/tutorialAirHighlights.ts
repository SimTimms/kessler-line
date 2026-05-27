import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { TUTORIAL_STEP_IDS } from './tutorialAirSteps';

export function highlightedHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    case TUTORIAL_STEP_IDS.GETTING_AIR_ONE:
      return [
        ScannerHUDElements.MAGNET,
        ScannerHUDElements.PROXIMITY,
        ScannerHUDElements.SPOTLIGHT,
      ];

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
