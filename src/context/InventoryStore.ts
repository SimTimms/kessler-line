import {
  effectiveTradeValue,
  getInventoryItemDef,
  resolveInventoryItemId,
} from '../config/inventoryCatalog';
import type { InventoryBlueprint, InventorySlot } from '../config/inventoryTypes';

export type { InventoryBlueprint, InventorySlot } from '../config/inventoryTypes';

export type InventoryOwnerKind = 'vessel' | 'dock' | 'contact';

export type InventoryOwnerRef =
  | { kind: 'vessel'; vesselId: string }
  | { kind: 'dock'; dockId: string }
  | { kind: 'contact'; dockId: string; contactId: string };

export interface InventoryState {
  ownerKey: string;
  owner: InventoryOwnerRef;
  label: string;
  slots: InventorySlot[];
}

export const INVENTORY_CHANGED = 'InventoryChanged';

const inventories = new Map<string, InventoryState>();

export function inventoryOwnerKey(owner: InventoryOwnerRef): string {
  switch (owner.kind) {
    case 'vessel':
      return `vessel:${owner.vesselId}`;
    case 'dock':
      return `dock:${owner.dockId}`;
    case 'contact':
      return `dock:${owner.dockId}:contact:${owner.contactId}`;
  }
}

function notifyChanged(ownerKey: string) {
  window.dispatchEvent(new CustomEvent(INVENTORY_CHANGED, { detail: { ownerKey } }));
}

function cloneSlots(slots: InventorySlot[] | undefined): InventorySlot[] {
  return (slots ?? []).map((slot) => ({
    ...slot,
    itemId: resolveInventoryItemId(slot.itemId),
    quantity: Math.max(0, slot.quantity),
  }));
}

function createInventory(
  owner: InventoryOwnerRef,
  blueprint?: InventoryBlueprint,
  fallbackLabel?: string
): InventoryState {
  return {
    ownerKey: inventoryOwnerKey(owner),
    owner,
    label: blueprint?.label ?? fallbackLabel ?? inventoryOwnerKey(owner),
    slots: cloneSlots(blueprint?.slots),
  };
}

export function ensureInventory(
  owner: InventoryOwnerRef,
  blueprint?: InventoryBlueprint,
  fallbackLabel?: string
): InventoryState {
  const key = inventoryOwnerKey(owner);
  let state = inventories.get(key);
  if (!state) {
    state = createInventory(owner, blueprint, fallbackLabel);
    inventories.set(key, state);
    return state;
  }
  if (blueprint?.label) state.label = blueprint.label;
  if (blueprint?.slots && state.slots.length === 0) {
    state.slots = cloneSlots(blueprint.slots);
  }
  return state;
}

export function getInventory(owner: InventoryOwnerRef): InventoryState | undefined {
  return inventories.get(inventoryOwnerKey(owner));
}

export function getInventoryByKey(ownerKey: string): InventoryState | undefined {
  return inventories.get(ownerKey);
}

export function clearInventory(owner: InventoryOwnerRef): void {
  inventories.delete(inventoryOwnerKey(owner));
}

export function clearAllInventories(): void {
  inventories.clear();
}

export function listInventorySlots(owner: InventoryOwnerRef): InventorySlot[] {
  return ensureInventory(owner).slots.map((slot) => ({ ...slot }));
}

function findSlot(state: InventoryState, itemIdOrLabel: string): InventorySlot | undefined {
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  return state.slots.find((slot) => slot.itemId === itemId);
}

function capacityFor(slot: InventorySlot): number {
  if (slot.capacity != null) return slot.capacity;
  return getInventoryItemDef(slot.itemId)?.defaultCapacity ?? Number.POSITIVE_INFINITY;
}

export function getItemQuantity(owner: InventoryOwnerRef, itemIdOrLabel: string): number {
  const state = getInventory(owner);
  if (!state) return 0;
  return findSlot(state, itemIdOrLabel)?.quantity ?? 0;
}

export function getItemSupply(owner: InventoryOwnerRef, itemIdOrLabel: string): number {
  return findSlot(ensureInventory(owner), itemIdOrLabel)?.supply ?? 0;
}

export function getItemDemand(owner: InventoryOwnerRef, itemIdOrLabel: string): number {
  return findSlot(ensureInventory(owner), itemIdOrLabel)?.demand ?? 0;
}

/** Unit trade value from this holder's supply/demand on the item. */
export function getOwnerUnitValue(owner: InventoryOwnerRef, itemIdOrLabel: string): number {
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  const def = getInventoryItemDef(itemId);
  const base = def?.baseValue ?? 10;
  const slot = findSlot(ensureInventory(owner), itemId);
  return effectiveTradeValue(base, slot?.supply ?? 0, slot?.demand ?? 0);
}

/**
 * How strongly this owner wants to acquire the item (for barter scoring).
 * Combines demand pressure with remaining free capacity.
 */
export function getAcquisitionDesire(owner: InventoryOwnerRef, itemIdOrLabel: string): number {
  const state = ensureInventory(owner);
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  let slot = findSlot(state, itemId);
  if (!slot) {
    const def = getInventoryItemDef(itemId);
    slot = {
      itemId,
      quantity: 0,
      capacity: def?.defaultCapacity,
      demand: 0,
      supply: 0,
    };
  }
  const free = Math.max(0, capacityFor(slot) - slot.quantity);
  if (free <= 0) return 0;
  return (slot.demand ?? 0) * (0.35 + Math.min(1, free / Math.max(1, capacityFor(slot))));
}

/**
 * How strongly this owner wants to offload the item (excess supply).
 */
export function getDisposalDesire(owner: InventoryOwnerRef, itemIdOrLabel: string): number {
  const slot = findSlot(ensureInventory(owner), itemIdOrLabel);
  if (!slot || slot.quantity <= 0) return 0;
  return (slot.supply ?? 0) * (0.35 + Math.min(1, slot.quantity / Math.max(1, capacityFor(slot))));
}

export function setInventorySlots(owner: InventoryOwnerRef, slots: InventorySlot[]): void {
  const state = ensureInventory(owner);
  state.slots = cloneSlots(slots);
  notifyChanged(state.ownerKey);
}

export function addInventoryItem(
  owner: InventoryOwnerRef,
  itemIdOrLabel: string,
  quantity: number,
  opts?: { capacity?: number; supply?: number; demand?: number }
): number {
  if (quantity <= 0) return getItemQuantity(owner, itemIdOrLabel);
  const state = ensureInventory(owner);
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  let slot = findSlot(state, itemId);
  if (!slot) {
    const def = getInventoryItemDef(itemId);
    slot = {
      itemId,
      quantity: 0,
      capacity: opts?.capacity ?? def?.defaultCapacity,
      supply: opts?.supply,
      demand: opts?.demand,
    };
    state.slots.push(slot);
  } else {
    if (opts?.capacity != null) slot.capacity = opts.capacity;
    if (opts?.supply != null) slot.supply = opts.supply;
    if (opts?.demand != null) slot.demand = opts.demand;
  }
  const cap = capacityFor(slot);
  const added = Math.min(quantity, Math.max(0, cap - slot.quantity));
  slot.quantity += added;
  notifyChanged(state.ownerKey);
  return slot.quantity;
}

export function removeInventoryItem(
  owner: InventoryOwnerRef,
  itemIdOrLabel: string,
  quantity: number
): number {
  if (quantity <= 0) return getItemQuantity(owner, itemIdOrLabel);
  const state = ensureInventory(owner);
  const slot = findSlot(state, itemIdOrLabel);
  if (!slot) return 0;
  const removed = Math.min(quantity, slot.quantity);
  slot.quantity -= removed;
  if (slot.quantity <= 0 && (slot.demand ?? 0) <= 0 && (slot.supply ?? 0) <= 0) {
    state.slots = state.slots.filter((s) => s !== slot);
  }
  notifyChanged(state.ownerKey);
  return removed;
}

export function transferInventoryItem(
  from: InventoryOwnerRef,
  to: InventoryOwnerRef,
  itemIdOrLabel: string,
  quantity: number
): number {
  const available = getItemQuantity(from, itemIdOrLabel);
  const moved = Math.min(quantity, available);
  if (moved <= 0) return 0;
  removeInventoryItem(from, itemIdOrLabel, moved);
  addInventoryItem(to, itemIdOrLabel, moved);
  return moved;
}

/** Register / refresh dock + contact inventories from dock config. */
export function registerDockInventories(
  dockId: string,
  dockLabel: string,
  dockInventory: InventoryBlueprint | undefined,
  contacts: Array<{ id: string; name: string; inventory?: InventoryBlueprint }> | undefined
): void {
  ensureInventory({ kind: 'dock', dockId }, dockInventory, dockLabel);
  for (const contact of contacts ?? []) {
    ensureInventory(
      { kind: 'contact', dockId, contactId: contact.id },
      contact.inventory,
      contact.name
    );
  }
}

export function unregisterDockInventories(
  dockId: string,
  contactIds: string[] = []
): void {
  clearInventory({ kind: 'dock', dockId });
  for (const contactId of contactIds) {
    clearInventory({ kind: 'contact', dockId, contactId });
  }
}

export function ensureVesselInventory(
  vesselId: string,
  blueprint?: InventoryBlueprint,
  label = vesselId
): InventoryState {
  return ensureInventory({ kind: 'vessel', vesselId }, blueprint, label);
}

export function getAllInventories(): ReadonlyMap<string, InventoryState> {
  return inventories;
}
