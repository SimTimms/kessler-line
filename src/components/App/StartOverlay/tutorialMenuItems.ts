import { GAME_MODES, type TutorialMenuSelection } from '../../../config/gameModes';

export const TUTORIAL_MENU_ITEMS: Array<{
    id: string;
    label: string;
    selection?: TutorialMenuSelection;
    placeholder?: boolean;
  }> = [
    {
      id: 'narrative-config',
      label: 'Start',
      selection: GAME_MODES.narrativeConfig,
    },
    { id: 'model-config', label: 'Model Config', selection: GAME_MODES.modelConfig },
    {
      id: 'combat-config',
      label: 'Combat Config',
      selection: GAME_MODES.combatConfig,
    },
    {
      id: 'ship-navigation-config',
      label: 'Gravity Config',
      selection: GAME_MODES.shipNavigationConfig,
    },
    { id: 'ship-config', label: 'Landing Pad Config', selection: GAME_MODES.shipConfig },
    { id: 'inventory-config', label: 'Inventory Config', selection: GAME_MODES.inventoryConfig },
    { id: 'salvage-config', label: 'Salvage Config', selection: GAME_MODES.salvageConfig },
    { id: 'drone-config', label: 'Drone Config', selection: GAME_MODES.droneConfig },
    {
      id: 'long-distance-travel-config',
      label: 'Long Distance Travel Config',
      selection: GAME_MODES.longDistanceTravelConfig,
    },
  
    {
      id: 'hud-config',
      label: 'HUD Config',
      selection: GAME_MODES.hudConfig,
    },
  
    { id: 'sandbox', label: 'Sandbox', selection: GAME_MODES.sandbox },
    { id: 'empty-scene', label: 'Empty Scene', selection: GAME_MODES.emptyScene },
  ];
  