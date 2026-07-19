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

export type InventoryItemOpts = {
  capacity?: number;
  supply?: number;
  demand?: number;
  salvagedBy?: string;
};

export const INVENTORY_CHANGED = 'InventoryChanged';

const inventories = new Map<string, InventoryState>();
/** Refcounts for shared dock bags keyed by inventoryOwnerId (not ownerKey). */
const dockBagRetain = new Map<string, number>();

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

function normalizeSalvagedBy(tag: string | undefined): string | undefined {
  return tag && tag.length > 0 ? tag : undefined;
}

function slotsMatch(
  slot: InventorySlot,
  itemId: string,
  salvagedBy: string | undefined
): boolean {
  return (
    slot.itemId === itemId &&
    normalizeSalvagedBy(slot.salvagedBy) === normalizeSalvagedBy(salvagedBy)
  );
}

function cloneSlots(slots: InventorySlot[] | undefined): InventorySlot[] {
  return (slots ?? []).map((slot) => ({
    ...slot,
    itemId: resolveInventoryItemId(slot.itemId),
    quantity: Math.max(0, slot.quantity),
    salvagedBy: normalizeSalvagedBy(slot.salvagedBy),
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
  dockBagRetain.clear();
}

export function listInventorySlots(owner: InventoryOwnerRef): InventorySlot[] {
  return ensureInventory(owner).slots.map((slot) => ({ ...slot }));
}

function findSlot(
  state: InventoryState,
  itemIdOrLabel: string,
  salvagedBy?: string
): InventorySlot | undefined {
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  const tag = normalizeSalvagedBy(salvagedBy);
  return state.slots.find((slot) => slotsMatch(slot, itemId, tag));
}

function capacityFor(slot: InventorySlot): number {
  if (slot.capacity != null) return slot.capacity;
  return getInventoryItemDef(slot.itemId)?.defaultCapacity ?? Number.POSITIVE_INFINITY;
}

/** Total quantity for an item; optionally only stacks with a given salvagedBy tag. */
export function getItemQuantity(
  owner: InventoryOwnerRef,
  itemIdOrLabel: string,
  opts?: { salvagedBy?: string }
): number {
  const state = getInventory(owner);
  if (!state) return 0;
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  if (opts && 'salvagedBy' in opts) {
    return findSlot(state, itemId, opts.salvagedBy)?.quantity ?? 0;
  }
  return state.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((sum, slot) => sum + slot.quantity, 0);
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
  opts?: InventoryItemOpts
): number {
  if (quantity <= 0) return getItemQuantity(owner, itemIdOrLabel, { salvagedBy: opts?.salvagedBy });
  const state = ensureInventory(owner);
  const itemId = resolveInventoryItemId(itemIdOrLabel);
  const salvagedBy = normalizeSalvagedBy(opts?.salvagedBy);
  let slot = findSlot(state, itemId, salvagedBy);
  if (!slot) {
    const def = getInventoryItemDef(itemId);
    slot = {
      itemId,
      quantity: 0,
      capacity: opts?.capacity ?? def?.defaultCapacity,
      supply: opts?.supply,
      demand: opts?.demand,
      salvagedBy,
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
  quantity: number,
  opts?: { salvagedBy?: string }
): number {
  if (quantity <= 0) return getItemQuantity(owner, itemIdOrLabel, opts);
  const state = ensureInventory(owner);
  const itemId = resolveInventoryItemId(itemIdOrLabel);

  // Prefer an exact-tag stack when specified; otherwise drain any stacks of the item.
  if (opts && 'salvagedBy' in opts) {
    const slot = findSlot(state, itemId, opts.salvagedBy);
    if (!slot) return 0;
    const removed = Math.min(quantity, slot.quantity);
    slot.quantity -= removed;
    if (slot.quantity <= 0 && (slot.demand ?? 0) <= 0 && (slot.supply ?? 0) <= 0) {
      state.slots = state.slots.filter((s) => s !== slot);
    }
    notifyChanged(state.ownerKey);
    return removed;
  }

  let remaining = quantity;
  let removedTotal = 0;
  for (const slot of [...state.slots]) {
    if (slot.itemId !== itemId || remaining <= 0) continue;
    const removed = Math.min(remaining, slot.quantity);
    slot.quantity -= removed;
    remaining -= removed;
    removedTotal += removed;
    if (slot.quantity <= 0 && (slot.demand ?? 0) <= 0 && (slot.supply ?? 0) <= 0) {
      state.slots = state.slots.filter((s) => s !== slot);
    }
  }
  if (removedTotal > 0) notifyChanged(state.ownerKey);
  return removedTotal;
}

export function transferInventoryItem(
  from: InventoryOwnerRef,
  to: InventoryOwnerRef,
  itemIdOrLabel: string,
  quantity: number,
  opts?: { salvagedBy?: string; setSalvagedBy?: string }
): number {
  const tag = opts && 'salvagedBy' in opts ? opts.salvagedBy : undefined;
  const available = getItemQuantity(from, itemIdOrLabel, tag !== undefined ? { salvagedBy: tag } : undefined);
  const moved = Math.min(quantity, available);
  if (moved <= 0) return 0;

  // Preserve source stack provenance unless explicitly overridden.
  let sourceTag = tag;
  if (sourceTag === undefined) {
    const fromState = getInventory(from);
    const itemId = resolveInventoryItemId(itemIdOrLabel);
    const first = fromState?.slots.find((s) => s.itemId === itemId && s.quantity > 0);
    sourceTag = first?.salvagedBy;
  }

  removeInventoryItem(from, itemIdOrLabel, moved, tag !== undefined ? { salvagedBy: tag } : undefined);
  const destTag = opts?.setSalvagedBy !== undefined ? opts.setSalvagedBy : sourceTag;
  addInventoryItem(to, itemIdOrLabel, moved, { salvagedBy: destTag });
  return moved;
}

/** Move every slot from one hold into another, optionally retagging. */
export function transferAllInventory(
  from: InventoryOwnerRef,
  to: InventoryOwnerRef,
  opts?: { setSalvagedBy?: string }
): number {
  const slots = listInventorySlots(from).filter((s) => s.quantity > 0);
  let moved = 0;
  for (const slot of slots) {
    moved += transferInventoryItem(from, to, slot.itemId, slot.quantity, {
      salvagedBy: slot.salvagedBy,
      setSalvagedBy: opts?.setSalvagedBy ?? slot.salvagedBy,
    });
  }
  return moved;
}

/** Qty map of stacks matching a salvagedBy tag (itemId → qty). */
export function inventoryTaggedQtyMap(
  owner: InventoryOwnerRef,
  salvagedBy: string
): Record<string, number> {
  const map: Record<string, number> = {};
  const tag = normalizeSalvagedBy(salvagedBy);
  for (const slot of listInventorySlots(owner)) {
    if (slot.quantity <= 0) continue;
    if (normalizeSalvagedBy(slot.salvagedBy) !== tag) continue;
    map[slot.itemId] = (map[slot.itemId] ?? 0) + Math.floor(slot.quantity);
  }
  return map;
}

function retainDockBag(bagId: string): void {
  dockBagRetain.set(bagId, (dockBagRetain.get(bagId) ?? 0) + 1);
}

function releaseDockBag(bagId: string): boolean {
  const next = (dockBagRetain.get(bagId) ?? 1) - 1;
  if (next <= 0) {
    dockBagRetain.delete(bagId);
    return true;
  }
  dockBagRetain.set(bagId, next);
  return false;
}

/** Register / refresh dock + contact inventories from dock config. */
export function registerDockInventories(
  dockId: string,
  dockLabel: string,
  dockInventory: InventoryBlueprint | undefined,
  contacts: Array<{ id: string; name: string; inventory?: InventoryBlueprint }> | undefined,
  inventoryOwnerId?: string
): void {
  const bagId = inventoryOwnerId ?? dockId;
  retainDockBag(bagId);
  ensureInventory({ kind: 'dock', dockId: bagId }, dockInventory, dockLabel);
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
  contactIds: string[] = [],
  inventoryOwnerId?: string
): void {
  const bagId = inventoryOwnerId ?? dockId;
  if (releaseDockBag(bagId)) {
    clearInventory({ kind: 'dock', dockId: bagId });
  }
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
