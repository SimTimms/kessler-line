import {
  addInventoryItem,
  ensureVesselInventory,
  listInventorySlots,
  removeInventoryItem,
  setInventorySlots,
  type InventorySlot,
} from './InventoryStore';
import { PLAYER_VESSEL_ID } from './PlayerShipState';

/** @deprecated Prefer InventorySlot from InventoryStore — kept for dialogueEffects / HUD. */
export interface CargoItem {
  name: string;
  quantity: number;
  salvagedBy?: string;
}

const playerOwner = { kind: 'vessel' as const, vesselId: PLAYER_VESSEL_ID };

ensureVesselInventory(PLAYER_VESSEL_ID, undefined, 'Player Ship');

function toCargoItems(slots: InventorySlot[]): CargoItem[] {
  return slots
    .filter((slot) => slot.quantity > 0)
    .map((slot) => ({
      name: slot.itemId,
      quantity: slot.quantity,
      salvagedBy: slot.salvagedBy,
    }));
}

/** Player cargo view — mirrors the player vessel inventory. */
export let cargo: CargoItem[] = toCargoItems(listInventorySlots(playerOwner));

function syncCargoBinding() {
  cargo = toCargoItems(listInventorySlots(playerOwner));
}

export function setCargo(items: CargoItem[]) {
  setInventorySlots(
    playerOwner,
    items.map((item) => ({
      itemId: item.name,
      quantity: item.quantity,
    }))
  );
  syncCargoBinding();
}

export function clearCargo() {
  setInventorySlots(playerOwner, []);
  syncCargoBinding();
}

export function reduceCargoItem(name: string, amount: number) {
  removeInventoryItem(playerOwner, name, amount);
  syncCargoBinding();
}

export function addCargoItem(name: string, amount: number) {
  addInventoryItem(playerOwner, name, amount);
  syncCargoBinding();
}

export function refreshPlayerCargoBinding() {
  syncCargoBinding();
}
