import {
  MOVEMENT_HUD_ELEMENTS,
  INVENTORY_HUD_ELEMENTS,
  HULL_HUD_ELEMENTS,
  RESOURCE_HUD_ELEMENTS,
} from '../Huds/PowerHUD/PowerHUD';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { TUTORIAL_STEP_IDS } from './tutorialResourcesSteps';

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
      return [RESOURCE_HUD_ELEMENTS.O2];

    case TUTORIAL_STEP_IDS.PROPELLENT:
      return [RESOURCE_HUD_ELEMENTS.PROPELLENT];

    case TUTORIAL_STEP_IDS.POWER:
      return [RESOURCE_HUD_ELEMENTS.POWER];

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
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter((element) => element !== 'o2'),
      ];

    case TUTORIAL_STEP_IDS.PROPELLENT:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter(
          (element) => element !== 'o2' && element !== 'propellant'
        ),
      ];

    case TUTORIAL_STEP_IDS.POWER:
      return [
        ...Object.values(MOVEMENT_HUD_ELEMENTS),
        ...Object.values(INVENTORY_HUD_ELEMENTS),
        ...Object.values(HULL_HUD_ELEMENTS),
        ...Object.values(RESOURCE_HUD_ELEMENTS).filter(
          (element) => element !== 'o2' && element !== 'propellant' && element !== 'power'
        ),
      ];

    default:
      return disableAllElements;
  }
}
