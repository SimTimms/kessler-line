import type {
  DockablePartnerConfig,
  DockableResourceSlot,
} from '../context/DockablePartnerStore';

export type ContainerInventory = {
  containerId: string;
  dockingBayId: string;
  label?: string;
  fuel?: DockableResourceSlot;
  o2?: DockableResourceSlot;
  power?: DockableResourceSlot;
  crew?: DockableResourceSlot;
};

export function containerInventoryToPartner(inventory: ContainerInventory): DockablePartnerConfig {
  return {
    partnerId: inventory.dockingBayId,
    label: inventory.label ?? 'Metal Container',
    fuel: inventory.fuel,
    o2: inventory.o2,
    power: inventory.power,
    crew: inventory.crew,
  };
}

/** Tutorial / air-lock container at bay C. */
export const TUTORIAL_CONTAINER_C_INVENTORY: ContainerInventory = {
  containerId: 'C',
  dockingBayId: 'C',
  label: 'Metal Container',
  fuel: { amount: 30, capacity: 100 },
  o2: { amount: 180, capacity: 200 },
  power: { amount: 40, capacity: 100 },
};
