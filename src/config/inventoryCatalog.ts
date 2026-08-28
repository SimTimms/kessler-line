/** Catalog of tradeable cargo items. Quantities live on inventories; this defines identity + base value. */

export type InventoryItemCategory =
  | 'ore'
  | 'fuel'
  | 'lifeSupport'
  | 'parts'
  | 'contraband'
  | 'misc';

export interface InventoryItemDef {
  id: string;
  label: string;
  category: InventoryItemCategory;
  /** Neutral market value used before supply/demand modifiers. */
  baseValue: number;
  /** Default stack capacity when a holder does not specify one. */
  defaultCapacity: number;
}

export const INVENTORY_ITEMS = {
  ironSlag: {
    id: 'iron-slag',
    label: 'Iron Slag (raw)',
    category: 'ore',
    baseValue: 12,
    defaultCapacity: 40,
  },
  o2Cells: {
    id: 'o2-cells',
    label: 'O2 Cells',
    category: 'lifeSupport',
    baseValue: 18,
    defaultCapacity: 30,
  },
  reactionMass: {
    id: 'reaction-mass',
    label: 'Reaction Mass',
    category: 'fuel',
    baseValue: 15,
    defaultCapacity: 50,
  },
  powerCells: {
    id: 'power-cells',
    label: 'Power Cells',
    category: 'parts',
    baseValue: 20,
    defaultCapacity: 30,
  },
  unmarkedCanister: {
    id: 'unmarked-canister',
    label: 'Unmarked Canister',
    category: 'contraband',
    baseValue: 55,
    defaultCapacity: 5,
  },
  organics: {
    id: 'organics',
    label: 'Organics Ration',
    category: 'lifeSupport',
    baseValue: 22,
    defaultCapacity: 20,
  },
  spareParts: {
    id: 'spare-parts',
    label: 'Spare Parts',
    category: 'parts',
    baseValue: 25,
    defaultCapacity: 20,
  },
  churchillParcel: {
    id: 'churchill-parcel',
    label: 'Sealed Parcel',
    category: 'misc',
    baseValue: 5,
    defaultCapacity: 1,
  },
  hullRepairPatch: {
    id: 'hull-repair-patch',
    label: 'Hull Repair Patch',
    category: 'parts',
    baseValue: 30,
    defaultCapacity: 10,
  },
  co2Filter: {
    id: 'co2-filter',
    label: 'CO2 Filter',
    category: 'lifeSupport',
    baseValue: 25,
    defaultCapacity: 10,
  },
} as const satisfies Record<string, InventoryItemDef>;

export type InventoryItemId = (typeof INVENTORY_ITEMS)[keyof typeof INVENTORY_ITEMS]['id'];

const BY_ID = new Map<string, InventoryItemDef>(
  Object.values(INVENTORY_ITEMS).map((item) => [item.id, item])
);

const BY_LABEL = new Map<string, InventoryItemDef>(
  Object.values(INVENTORY_ITEMS).map((item) => [item.label, item])
);

export function getInventoryItemDef(itemIdOrLabel: string): InventoryItemDef | undefined {
  return BY_ID.get(itemIdOrLabel) ?? BY_LABEL.get(itemIdOrLabel);
}

export function resolveInventoryItemId(itemIdOrLabel: string): string {
  return getInventoryItemDef(itemIdOrLabel)?.id ?? itemIdOrLabel;
}

/** HUD presentation for cargo hold cells. */
export type InventoryItemUi = {
  color: string;
  /** Short tag shown in the detail strip alongside the label. */
  tag: string;
};

export const INVENTORY_ITEM_UI: Record<string, InventoryItemUi> = {
  'iron-slag': { color: '#c4a35a', tag: 'ORE' },
  'o2-cells': { color: '#5ec8ff', tag: 'LIFE' },
  'reaction-mass': { color: '#6ad4a8', tag: 'FUEL' },
  'power-cells': { color: '#f0d060', tag: 'PWR' },
  'unmarked-canister': { color: '#e078a0', tag: '???' },
  organics: { color: '#8fd45a', tag: 'ORG' },
  'spare-parts': { color: '#9aa4b2', tag: 'PART' },
  'churchill-parcel': { color: '#c9a9ff', tag: 'TASK' },
  'hull-repair-patch': { color: '#ff6a4d', tag: 'RPR' },
  'co2-filter': { color: '#7ec8e3', tag: 'CO2' },
};

export function getInventoryItemUi(itemIdOrLabel: string): InventoryItemUi {
  const id = resolveInventoryItemId(itemIdOrLabel);
  return INVENTORY_ITEM_UI[id] ?? { color: '#00cfff', tag: 'CRG' };
}

/**
 * Effective barter value for one unit.
 * High demand raises value; high supply lowers it.
 */
export function effectiveTradeValue(
  baseValue: number,
  supply = 0,
  demand = 0
): number {
  return (baseValue * (1 + Math.max(0, demand))) / (1 + Math.max(0, supply));
}
