export type InventoryItem = {
  id: string;
  name: string;
  description: string;
};

export const inventoryItems: Record<string, InventoryItem> = {
  airCanister: {
    id: 'air-canister',
    name: 'Air Canister',
    description: 'A portable air canister that recharges ship air',
  },
  co2Filter: {
    id: 'co2-filter',
    name: 'CO2 Filter',
    description: 'A filter that removes CO2 from the air',
  },
  ironSlag: {
    id: 'iron-slag',
    name: 'Iron Slag',
    description: 'A raw ore',
  },
  o2Cells: {
    id: 'o2-cells',
    name: 'O2 Cells',
    description: 'A life support cell',
  },
  reactionMass: {
    id: 'reaction-mass',
    name: 'Reaction Mass',
    description: 'A fuel cell',
  },
  powerCells: {
    id: 'power-cells',
    name: 'Power Cells',
    description: 'A power cell',
  },
  hullRepairPatch: {
    id: 'hull-repair-patch',
    name: 'Hull Repair Patch',
    description: 'A hull repair patch',
  },
  emergencyBattery: {
    id: 'emergency-battery',
    name: 'Emergency Battery',
    description: 'A portable battery pack that recharges ship power',
  },
};
