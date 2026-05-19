export const GAME_MODES = {
  menu: 'menu',
  tutorial: 'tutorial',
  resources: 'resources',
  game: 'game',
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];
export type TutorialMenuSelection = typeof GAME_MODES.tutorial | typeof GAME_MODES.resources;
