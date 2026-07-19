import type { DockConfig } from '../dockConfig';
import { DRONE_CARGO_CAPACITY, MINING_DRONE_LABEL } from '../droneConfig';

/**
 * Dock partner for ship ↔ mining-drone resource and cargo transfers.
 * No crew slot — drones are unmanned.
 */
export const MINING_DRONE_DOCK_CONFIG: DockConfig = {
  label: MINING_DRONE_LABEL,
  backgroundImage: '/station.jpg',
  fuel: { amount: 60, capacity: 100 },
  o2: { amount: 40, capacity: 100 },
  power: { amount: 70, capacity: 100 },
  inventory: {
    label: 'Drone Hold',
    slots: [
      {
        itemId: 'iron-slag',
        quantity: 0,
        capacity: DRONE_CARGO_CAPACITY,
        supply: 0.1,
        demand: 0.1,
      },
    ],
  },
  contacts: [],
  jobBoard: [],
};
