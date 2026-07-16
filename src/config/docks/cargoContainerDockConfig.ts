import type { DockConfig } from '../dockConfig';

/** Default dock payload for a clonable cargo container instance. */
export const CARGO_CONTAINER_DOCK: DockConfig = {
  label: 'Cargo Container',
  backgroundImage: '/crate.jpg',
  fuel: { amount: 20, capacity: 100 },
  o2: { amount: 40, capacity: 100 },
  power: { amount: 50, capacity: 100 },
  crew: { amount: 0, capacity: 2 },
  inventory: {
    label: 'Container Hold',
    slots: [
      { itemId: 'spare-parts', quantity: 6, capacity: 20, supply: 0.55, demand: 0.2 },
      { itemId: 'iron-slag', quantity: 12, capacity: 40, supply: 0.7, demand: 0.1 },
      { itemId: 'organics', quantity: 3, capacity: 15, supply: 0.35, demand: 0.4 },
      { itemId: 'unmarked-canister', quantity: 1, capacity: 5, supply: 0.4, demand: 0.15 },
    ],
  },
  contacts: [],
  jobBoard: [],
};
