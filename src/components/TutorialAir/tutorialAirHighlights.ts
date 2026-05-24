import {
  MOVEMENT_HUD_ELEMENTS,
  INVENTORY_HUD_ELEMENTS,
  HULL_HUD_ELEMENTS,
  RESOURCE_HUD_ELEMENTS,
} from '../Huds/PowerHUD/PowerHUD';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { TUTORIAL_STEP_IDS } from './tutorialAirSteps';

export function getThrustersHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    default:
      return [];
  }
}

const disableAllElements = [
  ...Object.values(MOVEMENT_HUD_ELEMENTS),
  ...Object.values(INVENTORY_HUD_ELEMENTS),
  ...Object.values(HULL_HUD_ELEMENTS),
  ...Object.values(RESOURCE_HUD_ELEMENTS),
  ...Object.values(ScannerHUDElements),
];

export function highlightedHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    case TUTORIAL_STEP_IDS.RESOURCES:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS),
      ];

    case TUTORIAL_STEP_IDS.AIR:
      return [RESOURCE_HUD_ELEMENTS.O2, INVENTORY_HUD_ELEMENTS.CREW_STATUS];

    case TUTORIAL_STEP_IDS.PROPELLENT:
      return [RESOURCE_HUD_ELEMENTS.PROPELLENT];

    case TUTORIAL_STEP_IDS.POWER:
      return [RESOURCE_HUD_ELEMENTS.POWER];

    case TUTORIAL_STEP_IDS.SPOTLIGHT:
      return [ScannerHUDElements.SPOTLIGHT];

    case TUTORIAL_STEP_IDS.SCANNERS:
      return [...Object.values(ScannerHUDElements)];

    case TUTORIAL_STEP_IDS.MAGNETIC_SCAN:
      return [ScannerHUDElements.MAGNET];

    case TUTORIAL_STEP_IDS.DRIVE_SIGNATURE:
      return [ScannerHUDElements.DRIVE];

    case TUTORIAL_STEP_IDS.PROXIMITY:
      return [ScannerHUDElements.PROXIMITY];

    case TUTORIAL_STEP_IDS.RADIO:
      return [ScannerHUDElements.RADIO];

    case TUTORIAL_STEP_IDS.RADIATION:
      return [ScannerHUDElements.RADIATION];

    default:
      return [];
  }
}

export function disabledHudElements(stepId: string | undefined): string[] {
  switch (stepId) {
    case TUTORIAL_STEP_IDS.RESOURCES:
      return disableAllElements;

    case TUTORIAL_STEP_IDS.AIR:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS).filter((element) => element !== 'crew-status'),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter((element) => element !== 'o2'),
        ...Object.values(ScannerHUDElements),
      ];

    case TUTORIAL_STEP_IDS.PROPELLENT:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS).filter((element) => element !== 'crew-status'),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter(
          (element) => element !== 'o2' && element !== 'propellant'
        ),
        ...Object.values(ScannerHUDElements),
      ];

    case TUTORIAL_STEP_IDS.POWER:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS).filter((element) => element !== 'crew-status'),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter(
          (element) => element !== 'o2' && element !== 'propellant' && element !== 'power'
        ),
        ...Object.values(ScannerHUDElements),
      ];

    case TUTORIAL_STEP_IDS.SCANNERS:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS).filter((element) => element !== 'crew-status'),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter((element) => element !== 'o2'),
      ];
    case TUTORIAL_STEP_IDS.SPOTLIGHT:
      return [...Object.values(ScannerHUDElements).filter((element) => element !== 'spotlight')];

    case TUTORIAL_STEP_IDS.MAGNETIC_SCAN:
      return [
        ...Object.values(ScannerHUDElements).filter(
          (element) => element !== 'magnet' && element !== 'spotlight'
        ),
      ];

    case TUTORIAL_STEP_IDS.DRIVE_SIGNATURE:
      return [
        ...Object.values(ScannerHUDElements).filter(
          (element) => element !== 'drive' && element !== 'magnet' && element !== 'spotlight'
        ),
      ];

    case TUTORIAL_STEP_IDS.PROXIMITY:
      return [
        ...Object.values(ScannerHUDElements).filter(
          (element) =>
            element !== 'proximity' &&
            element !== 'magnet' &&
            element !== 'drive' &&
            element !== 'spotlight'
        ),
      ];

    case TUTORIAL_STEP_IDS.RADIO:
      return [
        ...Object.values(ScannerHUDElements).filter(
          (element) =>
            element !== 'radio' &&
            element !== 'magnet' &&
            element !== 'drive' &&
            element !== 'proximity' &&
            element !== 'spotlight'
        ),
      ];

    case TUTORIAL_STEP_IDS.RADIATION:
      return [
        ...Object.values(ScannerHUDElements).filter(
          (element) =>
            element !== 'radiation' &&
            element !== 'magnet' &&
            element !== 'drive' &&
            element !== 'proximity' &&
            element !== 'radio' &&
            element !== 'spotlight'
        ),
      ];

    case TUTORIAL_STEP_IDS.POWER_LEVELS:
    case TUTORIAL_STEP_IDS.G_FORCE:
    case TUTORIAL_STEP_IDS.TRY_SCANNERS:
      return [];

    default:
      return disableAllElements;
  }
}
