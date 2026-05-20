import {
  MOVEMENT_HUD_ELEMENTS,
  INVENTORY_HUD_ELEMENTS,
  HULL_HUD_ELEMENTS,
  RESOURCE_HUD_ELEMENTS,
} from '../Huds/PowerHUD/PowerHUD';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { TUTORIAL_STEP_IDS } from './tutorialMovementSteps';

export function getThrustersHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'bas-250-features':
      return ['vertical'];
    case 'bas-250-features-2':
      return ['main'];
    case 'bas-250-features-3':
      return ['rcs'];

    default:
      return [];
  }
}

export function highlightedHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'welcome':
    case 'bas-250':
    case 'bas-250-features':
    case 'bas-250-features-2':
    case 'bas-250-features-3':
      return [];

    case TUTORIAL_STEP_IDS.BAS_250_CAPACITY:
      return [INVENTORY_HUD_ELEMENTS.CREW_STATUS, INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY];

    case TUTORIAL_STEP_IDS.MAIN_THRUST:
      return [RESOURCE_HUD_ELEMENTS.PROPELLENT, MOVEMENT_HUD_ELEMENTS.VELOCITY];

    case TUTORIAL_STEP_IDS.FLIP:
      return [MOVEMENT_HUD_ELEMENTS.VELOCITY];

    default:
      return [];
  }
}

export function getScannerHudElementsHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'welcome':
      return [];

    default:
      return [];
  }
}

export function disabledHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'welcome':
    case 'bas-250':
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS),
      ];

    case TUTORIAL_STEP_IDS.BAS_250_FEATURES:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS),
      ];
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES_2:
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES_3:
    case TUTORIAL_STEP_IDS.BAS_250_CAPACITY:
    case TUTORIAL_STEP_IDS.CAMERA_ORBIT:
    case TUTORIAL_STEP_IDS.CAMERA_ZOOM:
    case TUTORIAL_STEP_IDS.CRISIS_MANAGEMENT:
    case TUTORIAL_STEP_IDS.YAW:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS),
      ];

    case TUTORIAL_STEP_IDS.THRUST:
    case TUTORIAL_STEP_IDS.MAIN_THRUST:
    case TUTORIAL_STEP_IDS.BRAKE:
    case TUTORIAL_STEP_IDS.FLIP:
    case TUTORIAL_STEP_IDS.STRAFE:
    case TUTORIAL_STEP_IDS.INERTIA_BRIEFING:
    case TUTORIAL_STEP_IDS.COUNTER_BURN_BRIEFING:
    case TUTORIAL_STEP_IDS.MOMENTUM_ASSIST_INTRO:
    case TUTORIAL_STEP_IDS.MOMENTUM_ASSIST_CONTROLS:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS),
      ];
    default:
      return [];
  }
}

export function getDisabledScannerHudElementsForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case TUTORIAL_STEP_IDS.WELCOME:
    case TUTORIAL_STEP_IDS.BAS_250:
    case TUTORIAL_STEP_IDS.BAS_250_CAPACITY:
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES:
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES_2:
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES_3:
    case TUTORIAL_STEP_IDS.CAMERA_ORBIT:
    case TUTORIAL_STEP_IDS.CAMERA_ZOOM:
    case TUTORIAL_STEP_IDS.CRISIS_MANAGEMENT:
    case TUTORIAL_STEP_IDS.YAW:
    case TUTORIAL_STEP_IDS.MAIN_THRUST:
    case TUTORIAL_STEP_IDS.BRAKE:
    case TUTORIAL_STEP_IDS.FLIP:
    case TUTORIAL_STEP_IDS.STRAFE:
    case TUTORIAL_STEP_IDS.INERTIA_BRIEFING:
    case TUTORIAL_STEP_IDS.COUNTER_BURN_BRIEFING:
    case TUTORIAL_STEP_IDS.MOMENTUM_ASSIST_INTRO:
    case TUTORIAL_STEP_IDS.MOMENTUM_ASSIST_CONTROLS:
      return [
        ScannerHUDElements.MAGNET,
        ScannerHUDElements.DRIVE,
        ScannerHUDElements.PROXIMITY,
        ScannerHUDElements.RADIO,
        ScannerHUDElements.RADIATION,
        ScannerHUDElements.SPOTLIGHT,
      ];

    default:
      return [];
  }
}
