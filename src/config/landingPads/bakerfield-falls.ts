import type { DockConfig } from '../dockConfig';
import { HANK_JOHNSON } from '../npcs/hank-johnson';

export const BAKERFIELD_FALLS_DOCK_CONFIG: DockConfig = {
  label: 'Bakerfield Falls',
  hailAcceptanceChance: 1,
  dockRequestAcceptanceChance: 1,
  backgroundImage: '/station.jpg',
  fuel: { amount: 45, capacity: 100 },
  o2: { amount: 50, capacity: 100 },
  power: { amount: 72, capacity: 100 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Bakerfield Falls Depot',
    slots: [
      { itemId: 'o2-cells', quantity: 10, capacity: 30, supply: 0.55, demand: 0.25 },
      { itemId: 'organics', quantity: 8, capacity: 20, supply: 0.45, demand: 0.35 },
      { itemId: 'power-cells', quantity: 5, capacity: 20, supply: 0.35, demand: 0.45 },
    ],
  },
  contacts: [HANK_JOHNSON],
  jobBoard: [],
};
