export const GAME_MODES = {
  menu: 'menu',
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
  | typeof GAME_MODES.sandbox
  | typeof GAME_MODES.tutorial
  | typeof GAME_MODES.resources
  | typeof GAME_MODES.airManagement
  | typeof GAME_MODES.radioManagement
  | typeof GAME_MODES.orbitalManagement;
