import type { DockConfig } from '../dockConfig';
import { BILL_CHURCHILL } from '../npcs/bill-churchill';
import { ELIAS_VOSS } from '../npcs/elias-voss';
import { CHEIA_DOOLHARDY } from '../npcs/cheia-doolhardy';

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export const DONINGTON_STATION_DOCK_CONFIG: DockConfig = {
  label: 'Donington Station',
  hailAcceptanceChance: 1,
  dockRequestAcceptanceChance: 1,
  backgroundImage: '/donington-station.jpg',
  fuel: { amount: randBetween(50, 150), capacity: 500 },
  o2: { amount: randBetween(50, 150), capacity: 500 },
  power: { amount: randBetween(50, 150), capacity: 500 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Donington Depot',
    slots: [],
  },
  contacts: [BILL_CHURCHILL, ELIAS_VOSS, CHEIA_DOOLHARDY],
  jobBoard: [],
};
