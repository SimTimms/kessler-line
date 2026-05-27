import {
  DOCK_TRANSFER_HOLD_RATE,
  DOCK_TRANSFER_STEP,
  SHIP_CREW_CAPACITY,
  SHIP_RESOURCE_MAX,
} from '../config/dockTransferConfig';
import { fuel, o2, power, setFuel, setO2, setPower, shipCrew, setShipCrew } from './ShipState';

export type DockableResourceKind = 'fuel' | 'o2' | 'power' | 'crew';

export type DockableResourceSlot = {
  amount: number;
  capacity: number;
};

export type DockablePartnerConfig = {
  /** Matches `ShipDocked` detail.stationId (docking bay id). */
  partnerId: string;
  label: string;
  fuel?: DockableResourceSlot;
  o2?: DockableResourceSlot;
  power?: DockableResourceSlot;
  crew?: DockableResourceSlot;
};

type PartnerState = DockablePartnerConfig;

const partners = new Map<string, PartnerState>();

export const DOCKABLE_PARTNER_CHANGED = 'DockablePartnerChanged';

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DOCKABLE_PARTNER_CHANGED));
}

export function registerDockablePartner(config: DockablePartnerConfig) {
  partners.set(config.partnerId, {
    ...config,
    fuel: config.fuel ? { ...config.fuel } : undefined,
    o2: config.o2 ? { ...config.o2 } : undefined,
    power: config.power ? { ...config.power } : undefined,
    crew: config.crew ? { ...config.crew } : undefined,
  });
}

export function unregisterDockablePartner(partnerId: string) {
  partners.delete(partnerId);
}

export function hasDockablePartner(partnerId: string | null): partnerId is string {
  return partnerId != null && partners.has(partnerId);
}

export function getDockablePartner(partnerId: string): PartnerState | undefined {
  return partners.get(partnerId);
}

export function getDockablePartnerLabel(partnerId: string): string {
  return partners.get(partnerId)?.label ?? partnerId;
}

export function listPartnerResources(partnerId: string): DockableResourceKind[] {
  const p = partners.get(partnerId);
  if (!p) return [];
  const kinds: DockableResourceKind[] = [];
  if (p.fuel) kinds.push('fuel');
  if (p.o2) kinds.push('o2');
  if (p.power) kinds.push('power');
  if (p.crew) kinds.push('crew');
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
  partner: PartnerState,
  kind: DockableResourceKind
): DockableResourceSlot | undefined {
  switch (kind) {
    case 'fuel':
      return partner.fuel;
    case 'o2':
      return partner.o2;
    case 'power':
      return partner.power;
    case 'crew':
      return partner.crew;
  }
}

/** Move resources between ship and docked partner. Returns units actually moved. */
export function transferDockableResource(
  partnerId: string,
  kind: DockableResourceKind,
  direction: 'toPartner' | 'toShip',
  amount: number
): number {
  const partner = partners.get(partnerId);
  const slot = partner ? partnerSlot(partner, kind) : undefined;
  if (!partner || !slot || amount <= 0) return 0;

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
  const slot = partners.get(partnerId);
  if (!slot) return 0;
  const s = partnerSlot(slot, kind);
  return s ? s.amount : 0;
}

export function readPartnerCapacity(partnerId: string, kind: DockableResourceKind): number {
  const slot = partners.get(partnerId);
  if (!slot) return 0;
  const s = partnerSlot(slot, kind);
  return s ? s.capacity : 0;
}
