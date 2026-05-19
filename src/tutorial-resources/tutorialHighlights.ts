import { POWER_HUD_ELEMENTS } from '../components/Huds/PowerHUD/PowerHUD';
import { HUDElements } from '../components/Huds/HUD/HUD';
import { TUTORIAL_STEP_IDS } from './tutorialSteps';

export function getThrustersHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'bas-250-features':
      return ['vertical'];
    case 'bas-250-features-2':
      return ['main'];
    case 'bas-250-features-3':
      return ['rcs'];

    case TUTORIAL_STEP_IDS.SCANNERS:
      return [
        HUDElements.PROXIMITY,
        HUDElements.RADIO,
        HUDElements.RADIATION,
        HUDElements.SPOTLIGHT,
        HUDElements.MAGNET,
      ];
    default:
      return [];
  }
}

export function getPowerHudElementsHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'welcome':
    case 'bas-250':
    case 'bas-250-features':
    case 'bas-250-features-2':
    case 'bas-250-features-3':
      return [];

    case TUTORIAL_STEP_IDS.BAS_250_CAPACITY:
      return [POWER_HUD_ELEMENTS.CREW_STATUS, POWER_HUD_ELEMENTS.CARGO_CAPACITY];

    case TUTORIAL_STEP_IDS.MAIN_THRUST:
      return [POWER_HUD_ELEMENTS.PROPELLENT, POWER_HUD_ELEMENTS.VELOCITY];

    case TUTORIAL_STEP_IDS.FLIP:
      return [POWER_HUD_ELEMENTS.VELOCITY];

    case TUTORIAL_STEP_IDS.RESOURCES:
      return [
        POWER_HUD_ELEMENTS.POWER,
        POWER_HUD_ELEMENTS.HULL,
        POWER_HUD_ELEMENTS.PROPELLENT,
        POWER_HUD_ELEMENTS.O2,
      ];

    case TUTORIAL_STEP_IDS.AIR:
      return [POWER_HUD_ELEMENTS.O2];

    default:
      return [];
  }
}

export function getHudElementsHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'welcome':
      return [];

    default:
      return [];
  }
}

export function getDisabledPowerElementsForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'welcome':
    case 'bas-250':
      return [
        POWER_HUD_ELEMENTS.POWER,
        POWER_HUD_ELEMENTS.HULL,
        POWER_HUD_ELEMENTS.PROPELLENT,
        POWER_HUD_ELEMENTS.O2,
        POWER_HUD_ELEMENTS.VELOCITY,
        POWER_HUD_ELEMENTS.GFORCE,
        POWER_HUD_ELEMENTS.CREW_STATUS,
        POWER_HUD_ELEMENTS.CARGO_CAPACITY,
      ];

    case TUTORIAL_STEP_IDS.BAS_250_FEATURES:
      return [
        POWER_HUD_ELEMENTS.POWER,
        POWER_HUD_ELEMENTS.HULL,
        POWER_HUD_ELEMENTS.PROPELLENT,
        POWER_HUD_ELEMENTS.O2,
        POWER_HUD_ELEMENTS.VELOCITY,
        POWER_HUD_ELEMENTS.GFORCE,
      ];
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES_2:
    case TUTORIAL_STEP_IDS.BAS_250_FEATURES_3:
    case TUTORIAL_STEP_IDS.BAS_250_CAPACITY:
    case TUTORIAL_STEP_IDS.CAMERA_ORBIT:
    case TUTORIAL_STEP_IDS.CAMERA_ZOOM:
    case TUTORIAL_STEP_IDS.CRISIS_MANAGEMENT:
    case TUTORIAL_STEP_IDS.YAW:
      return [
        POWER_HUD_ELEMENTS.POWER,
        POWER_HUD_ELEMENTS.HULL,
        POWER_HUD_ELEMENTS.PROPELLENT,
        POWER_HUD_ELEMENTS.O2,
        POWER_HUD_ELEMENTS.VELOCITY,
        POWER_HUD_ELEMENTS.GFORCE,
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
        POWER_HUD_ELEMENTS.POWER,
        POWER_HUD_ELEMENTS.HULL,
        POWER_HUD_ELEMENTS.O2,
        POWER_HUD_ELEMENTS.GFORCE,
      ];
    default:
      return [];
  }
}

export function getDisabledHudElementsForStep(stepId: string | undefined): string[] {
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
        HUDElements.MAGNET,
        HUDElements.DRIVE,
        HUDElements.PROXIMITY,
        HUDElements.RADIO,
        HUDElements.RADIATION,
        HUDElements.SPOTLIGHT,
      ];

    default:
      return [];
  }
}
