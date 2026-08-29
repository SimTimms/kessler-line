import type { DockConfig } from '../dockConfig';
import { BILL_CHURCHILL } from '../npcs/bill-churchill';
import { ELIAS_VOSS } from '../npcs/elias-voss';

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export const DONINGTON_STATION_DOCK_CONFIG: DockConfig = {
  label: 'Donington Station',
  hailAcceptanceChance: 1,
  dockRequestAcceptanceChance: 1,
  backgroundImage: '/station.jpg',
  fuel: { amount: randBetween(50, 150), capacity: 500 },
  o2: { amount: randBetween(50, 150), capacity: 500 },
  power: { amount: randBetween(50, 150), capacity: 500 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Donington Depot',
    slots: [
      { itemId: 'spare-parts', quantity: 6, capacity: 30, supply: 0.6, demand: 0.2 },
      { itemId: 'iron-slag', quantity: 12, capacity: 45, supply: 0.75, demand: 0.15 },
      { itemId: 'reaction-mass', quantity: 4, capacity: 30, supply: 0.25, demand: 0.5 },
    ],
  },
  contacts: [BILL_CHURCHILL, ELIAS_VOSS],
  jobBoard: [],
};
