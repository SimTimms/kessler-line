import {
  DOCK_TRANSFER_HOLD_RATE,
  DOCK_TRANSFER_STEP,
  SHIP_CREW_CAPACITY,
  SHIP_RESOURCE_MAX,
} from '../config/dockTransferConfig';
import type {
  DockableResourceSlot,
  DockContact,
  DockJob,
  RegisteredDockConfig,
} from '../config/dockConfig';
import { fuel, o2, power, setFuel, setO2, setPower, shipCrew, setShipCrew } from './ShipState';
import {
  registerDockInventories,
  unregisterDockInventories,
} from './InventoryStore';

export type DockableResourceKind = 'fuel' | 'o2' | 'power' | 'crew';

/** @deprecated Use RegisteredDockConfig from dockConfig.ts */
export type DockablePartnerConfig = RegisteredDockConfig;

const docks = new Map<string, RegisteredDockConfig>();

export const DOCKABLE_PARTNER_CHANGED = 'DockablePartnerChanged';

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DOCKABLE_PARTNER_CHANGED));
}

function cloneDock(config: RegisteredDockConfig): RegisteredDockConfig {
  return {
    ...config,
    fuel: config.fuel ? { ...config.fuel } : undefined,
    o2: config.o2 ? { ...config.o2 } : undefined,
    power: config.power ? { ...config.power } : undefined,
    crew: config.crew ? { ...config.crew } : undefined,
    inventory: config.inventory
      ? {
          ...config.inventory,
          slots: config.inventory.slots?.map((slot) => ({ ...slot })),
        }
      : undefined,
    contacts: config.contacts?.map((c) => ({
      ...c,
      dialogue: c.dialogue,
      inventory: c.inventory
        ? {
            ...c.inventory,
            slots: c.inventory.slots?.map((slot) => ({ ...slot })),
          }
        : undefined,
    })),
    jobBoard: config.jobBoard?.map((j) => ({ ...j, dialogue: j.dialogue })),
  };
}

export function registerDock(config: RegisteredDockConfig) {
  const cloned = cloneDock(config);
  docks.set(cloned.id, cloned);
  registerDockInventories(
    cloned.id,
    cloned.label,
    cloned.inventory,
    cloned.contacts?.map((c) => ({
      id: c.id,
      name: c.name,
      inventory: c.inventory,
    }))
  );
}

export function unregisterDock(dockId: string) {
  const existing = docks.get(dockId);
  const contactIds = existing?.contacts?.map((c) => c.id) ?? [];
  docks.delete(dockId);
  unregisterDockInventories(dockId, contactIds);
}

/** @deprecated Use registerDock */
export function registerDockablePartner(config: RegisteredDockConfig) {
  registerDock(config);
}

/** @deprecated Use unregisterDock */
export function unregisterDockablePartner(partnerId: string) {
  unregisterDock(partnerId);
}

export function hasDockablePartner(dockId: string | null): dockId is string {
  return dockId != null && docks.has(dockId);
}

export function getDock(dockId: string): RegisteredDockConfig | undefined {
  return docks.get(dockId);
}

/** @deprecated Use getDock */
export function getDockablePartner(dockId: string): RegisteredDockConfig | undefined {
  return getDock(dockId);
}

export function getDockablePartnerLabel(dockId: string): string {
  return docks.get(dockId)?.label ?? dockId;
}

export function getDockContacts(dockId: string): DockContact[] {
  return docks.get(dockId)?.contacts ?? [];
}

export function getDockJobs(dockId: string): DockJob[] {
  return docks.get(dockId)?.jobBoard ?? [];
}

export function getDockContact(dockId: string, contactId: string): DockContact | undefined {
  return getDockContacts(dockId).find((c) => c.id === contactId);
}

export function getDockJob(dockId: string, jobId: string): DockJob | undefined {
  return getDockJobs(dockId).find((j) => j.id === jobId);
}

export function listPartnerResources(dockId: string): DockableResourceKind[] {
  const dock = docks.get(dockId);
  if (!dock) return [];
  const kinds: DockableResourceKind[] = [];
  if (dock.fuel) kinds.push('fuel');
  if (dock.o2) kinds.push('o2');
  if (dock.power) kinds.push('power');
  if (dock.crew) kinds.push('crew');
  return kinds;
}

function shipAmount(kind: DockableResourceKind): number {
  switch (kind) {
    case 'fuel':
      return fuel;
    case 'o2':
      return o2;
    case 'power':
      return power;
    case 'crew':
      return shipCrew;
  }
}

function shipCapacity(kind: DockableResourceKind): number {
  switch (kind) {
    case 'fuel':
    case 'o2':
    case 'power':
      return SHIP_RESOURCE_MAX;
    case 'crew':
      return SHIP_CREW_CAPACITY;
  }
}

function setShipAmount(kind: DockableResourceKind, value: number) {
  switch (kind) {
    case 'fuel':
      setFuel(value);
      break;
    case 'o2':
      setO2(value);
      break;
    case 'power':
      setPower(value);
      break;
    case 'crew':
      setShipCrew(value);
      break;
  }
}

function partnerSlot(
  dock: RegisteredDockConfig,
  kind: DockableResourceKind
): DockableResourceSlot | undefined {
  switch (kind) {
    case 'fuel':
      return dock.fuel;
    case 'o2':
      return dock.o2;
    case 'power':
      return dock.power;
    case 'crew':
      return dock.crew;
  }
}

export function transferDockableResource(
  partnerId: string,
  kind: DockableResourceKind,
  direction: 'toPartner' | 'toShip',
  amount: number
): number {
  const dock = docks.get(partnerId);
  const slot = dock ? partnerSlot(dock, kind) : undefined;
  if (!dock || !slot || amount <= 0) return 0;

  const shipVal = shipAmount(kind);
  const shipCap = shipCapacity(kind);

  let moved = 0;
  if (direction === 'toPartner') {
    const space = slot.capacity - slot.amount;
    moved = Math.min(amount, shipVal, space);
    if (moved <= 0) return 0;
    setShipAmount(kind, shipVal - moved);
    slot.amount += moved;
  } else {
    const space = shipCap - shipVal;
    moved = Math.min(amount, slot.amount, space);
    if (moved <= 0) return 0;
    slot.amount -= moved;
    setShipAmount(kind, shipVal + moved);
  }

  notifyChanged();
  return moved;
}

export function transferDockableStep(
  partnerId: string,
  kind: DockableResourceKind,
  direction: 'toPartner' | 'toShip'
): number {
  return transferDockableResource(partnerId, kind, direction, DOCK_TRANSFER_STEP);
}

export function transferDockableHold(
  partnerId: string,
  kind: DockableResourceKind,
  direction: 'toPartner' | 'toShip',
  deltaSec: number
): number {
  return transferDockableResource(
    partnerId,
    kind,
    direction,
    DOCK_TRANSFER_HOLD_RATE * deltaSec
  );
}

export function readPartnerAmount(partnerId: string, kind: DockableResourceKind): number {
  const dock = docks.get(partnerId);
  if (!dock) return 0;
  const slot = partnerSlot(dock, kind);
  return slot ? slot.amount : 0;
}

export function readPartnerCapacity(partnerId: string, kind: DockableResourceKind): number {
  const dock = docks.get(partnerId);
  if (!dock) return 0;
  const slot = partnerSlot(dock, kind);
  return slot ? slot.capacity : 0;
}
