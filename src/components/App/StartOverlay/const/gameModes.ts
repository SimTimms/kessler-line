import { GAME_MODES, type TutorialMenuSelection } from '../../../../config/gameModes';

export const AMBIENT_ON_SELECT: ReadonlySet<TutorialMenuSelection> = new Set([
  GAME_MODES.modelConfig,
  GAME_MODES.shipNavigationConfig,
  GAME_MODES.shipConfig,
  GAME_MODES.inventoryConfig,
  GAME_MODES.salvageConfig,
  GAME_MODES.droneConfig,
  GAME_MODES.longDistanceTravelConfig,
  GAME_MODES.combatConfig,
  GAME_MODES.hudConfig,
  GAME_MODES.narrativeConfig,
]);
