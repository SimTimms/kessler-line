export const GAME_MODES = {
  menu: 'menu',
  modelConfig: 'modelConfig',
  shipConfig: 'shipConfig',
  inventoryConfig: 'inventoryConfig',
  salvageConfig: 'salvageConfig',
  droneConfig: 'droneConfig',
  longDistanceTravelConfig: 'longDistanceTravelConfig',
  combatConfig: 'combatConfig',
  hudConfig: 'hudConfig',
  narrativeConfig: 'narrativeConfig',
  sandbox: 'sandbox',
  tutorial: 'tutorial',
  resources: 'resources',
  airManagement: 'airManagement',
  radioManagement: 'radioManagement',
  game: 'game',
  orbitalManagement: 'orbitalManagement',
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];
export type TutorialMenuSelection =
  | typeof GAME_MODES.modelConfig
  | typeof GAME_MODES.shipConfig
  | typeof GAME_MODES.inventoryConfig
  | typeof GAME_MODES.salvageConfig
  | typeof GAME_MODES.droneConfig
  | typeof GAME_MODES.longDistanceTravelConfig
  | typeof GAME_MODES.combatConfig
  | typeof GAME_MODES.hudConfig
  | typeof GAME_MODES.narrativeConfig
  | typeof GAME_MODES.sandbox
  | typeof GAME_MODES.tutorial
  | typeof GAME_MODES.resources
  | typeof GAME_MODES.airManagement
  | typeof GAME_MODES.radioManagement
  | typeof GAME_MODES.orbitalManagement;
