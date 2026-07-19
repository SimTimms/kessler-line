import {
  Droplets,
  Wind,
  Zap,
  Package,
  Leaf,
  Wrench,
  Mountain,
  type LucideIcon,
} from 'lucide-react';
import type { CargoItem } from '../../../../context/Inventory';
import { refreshPlayerCargoBinding } from '../../../../context/Inventory';
import {
  listInventorySlots,
  transferInventoryItem,
  type InventoryOwnerRef,
} from '../../../../context/InventoryStore';
import {
  getInventoryItemDef,
  getInventoryItemUi,
  resolveInventoryItemId,
} from '../../../../config/inventoryCatalog';
import { PLAYER_SALVAGED_BY } from '../../../../config/inventoryTypes';
import { CARGO_HOLD_SLOT_COUNT } from './cargoHoldConstants';

export const ITEM_ICONS: Record<string, LucideIcon> = {
  'iron-slag': Mountain,
  'o2-cells': Wind,
  'reaction-mass': Droplets,
  'power-cells': Zap,
  'unmarked-canister': Package,
  organics: Leaf,
  'spare-parts': Wrench,
};

export type HoldCell =
  | { filled: false }
  | {
      filled: true;
      itemId: string;
      label: string;
      stackQuantity: number;
      color: string;
      Icon: LucideIcon;
      salvagedBy?: string;
      provenanceLabel?: string;
    };

/** HTML5 DnD mime type for cargo stack transfers. */
export const CARGO_DRAG_MIME = 'application/x-crubbs-cargo';

export type CargoDragPayload = {
  itemId: string;
  quantity: number;
  from: InventoryOwnerRef;
  salvagedBy?: string;
};

export function provenanceLabelFor(salvagedBy: string | undefined): string | undefined {
  if (!salvagedBy) return undefined;
  if (salvagedBy === PLAYER_SALVAGED_BY) return 'Salvaged by you';
  return `Salvaged by ${salvagedBy}`;
}

export function expandCargoToCells(
  items: CargoItem[],
  slotCount = CARGO_HOLD_SLOT_COUNT
): HoldCell[] {
  const cells: HoldCell[] = [];
  for (const item of items) {
    const itemId = resolveInventoryItemId(item.name);
    const def = getInventoryItemDef(itemId);
    const ui = getInventoryItemUi(itemId);
    const Icon = ITEM_ICONS[itemId] ?? Package;
    const qty = Math.max(0, Math.floor(item.quantity));
    const provenanceLabel = provenanceLabelFor(item.salvagedBy);
    for (let i = 0; i < qty && cells.length < slotCount; i++) {
      cells.push({
        filled: true,
        itemId,
        label: def?.label ?? item.name,
        stackQuantity: qty,
        color: ui.color,
        Icon,
        salvagedBy: item.salvagedBy,
        provenanceLabel,
      });
    }
  }
  while (cells.length < slotCount) {
    cells.push({ filled: false });
  }
  return cells;
}

export function slotsToCargoItems(
  slots: ReturnType<typeof listInventorySlots>
): CargoItem[] {
  return slots
    .filter((slot) => slot.quantity > 0)
    .map((slot) => ({
      name: slot.itemId,
      quantity: slot.quantity,
      salvagedBy: slot.salvagedBy,
    }));
}

export function countCargoUnits(owner: InventoryOwnerRef): number {
  return listInventorySlots(owner).reduce((sum, slot) => sum + Math.max(0, slot.quantity), 0);
}

export function parseCargoDragPayload(data: string): CargoDragPayload | null {
  try {
    const parsed = JSON.parse(data) as CargoDragPayload;
    if (!parsed?.itemId || !parsed?.from || !(parsed.quantity > 0)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readCargoDragPayload(dataTransfer: DataTransfer): CargoDragPayload | null {
  return (
    parseCargoDragPayload(dataTransfer.getData(CARGO_DRAG_MIME)) ??
    parseCargoDragPayload(dataTransfer.getData('text/plain'))
  );
}

export function isCargoDragEvent(dataTransfer: DataTransfer): boolean {
  const types = [...dataTransfer.types];
  return types.includes(CARGO_DRAG_MIME) || types.includes('text/plain');
}

export function writeCargoDragPayload(dataTransfer: DataTransfer, payload: CargoDragPayload): void {
  const json = JSON.stringify(payload);
  dataTransfer.setData(CARGO_DRAG_MIME, json);
  dataTransfer.setData('text/plain', json);
  dataTransfer.effectAllowed = 'move';
}

function sameOwner(a: InventoryOwnerRef, b: InventoryOwnerRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'vessel' && b.kind === 'vessel') return a.vesselId === b.vesselId;
  if (a.kind === 'dock' && b.kind === 'dock') return a.dockId === b.dockId;
  if (a.kind === 'contact' && b.kind === 'contact') {
    return a.dockId === b.dockId && a.contactId === b.contactId;
  }
  return false;
}

/**
 * Move a cargo stack between inventories. Clamps ship hold to
 * {@link CARGO_HOLD_SLOT_COUNT} visual capacity.
 */
export function transferCargoStack(
  from: InventoryOwnerRef,
  to: InventoryOwnerRef,
  itemId: string,
  quantity: number,
  salvagedBy?: string
): number {
  if (sameOwner(from, to) || quantity <= 0) return 0;

  let qty = Math.floor(quantity);
  if (to.kind === 'vessel') {
    const free = Math.max(0, CARGO_HOLD_SLOT_COUNT - countCargoUnits(to));
    qty = Math.min(qty, free);
  }
  if (qty <= 0) return 0;

  const moved = transferInventoryItem(
    from,
    to,
    itemId,
    qty,
    salvagedBy !== undefined ? { salvagedBy } : undefined
  );
  if (moved > 0) {
    if (from.kind === 'vessel' || to.kind === 'vessel') {
      refreshPlayerCargoBinding();
    }
  }
  return moved;
}
