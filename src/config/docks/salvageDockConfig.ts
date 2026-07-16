import type { DockConfig } from '../dockConfig';

/** Single berth for the salvage authoring scene. */
export const SALVAGE_DOCK_CONFIG: DockConfig = {
  label: 'Salvage Berth',
  backgroundImage: '/station.jpg',
  fuel: { amount: 40, capacity: 100 },
  o2: { amount: 55, capacity: 100 },
  power: { amount: 70, capacity: 100 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Salvage Depot',
    slots: [
      { itemId: 'spare-parts', quantity: 8, capacity: 30, supply: 0.55, demand: 0.2 },
      { itemId: 'iron-slag', quantity: 14, capacity: 50, supply: 0.7, demand: 0.1 },
      { itemId: 'unmarked-canister', quantity: 1, capacity: 5, supply: 0.4, demand: 0.15 },
      { itemId: 'reaction-mass', quantity: 4, capacity: 40, supply: 0.25, demand: 0.5 },
    ],
  },
  contacts: [],
  jobBoard: [],
};
