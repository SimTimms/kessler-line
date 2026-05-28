import { Droplets, Wind, Zap, User, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cargo, reduceCargoItem } from './Inventory';
import {
  fuel,
  o2,
  power,
  shipCrew,
  setFuel,
  setO2,
  setPower,
  setShipCrew,
} from './ShipState';
import {
  SHIP_CREW_CAPACITY,
  SHIP_MIN_CREW_ONBOARD,
  SHIP_RESOURCE_MAX,
} from '../config/dockTransferConfig';
import {
  VENT_RESOURCE_CHANGED,
  type VentResourceKind,
} from '../config/ventResourceConfig';
import { queueVentParticles } from './ventParticles';
import { queueCrewEject } from './ventCrewEject';

export interface VentResourceMeta {
  kind: VentResourceKind;
  label: string;
  icon: LucideIcon;
  unitLabel: string;
}

export const VENT_RESOURCE_META: Record<VentResourceKind, VentResourceMeta> = {
  fuel: { kind: 'fuel', label: 'Fuel', icon: Droplets, unitLabel: 'units' },
  o2: { kind: 'o2', label: 'O2', icon: Wind, unitLabel: 'units' },
  power: { kind: 'power', label: 'Power', icon: Zap, unitLabel: 'units' },
  crew: { kind: 'crew', label: 'Crew', icon: User, unitLabel: 'crew' },
  cargo: { kind: 'cargo', label: 'Cargo', icon: Package, unitLabel: 'units' },
};

function notifyVentChanged() {
  window.dispatchEvent(new CustomEvent(VENT_RESOURCE_CHANGED));
}

export function getVentResourceAmount(kind: VentResourceKind): number {
  switch (kind) {
    case 'fuel':
      return Math.floor(fuel);
    case 'o2':
      return Math.floor(o2);
    case 'power':
      return Math.floor(power);
    case 'crew':
      return Math.floor(shipCrew);
    case 'cargo':
      return cargo.reduce((sum, item) => sum + item.quantity, 0);
  }
}

export function getVentResourceCapacity(kind: VentResourceKind): number {
  switch (kind) {
    case 'fuel':
    case 'o2':
    case 'power':
      return SHIP_RESOURCE_MAX;
    case 'crew':
      return SHIP_CREW_CAPACITY;
    case 'cargo':
      return Math.max(1, getVentResourceAmount('cargo'));
  }
}

/** Maximum amount that can be vented in one operation. */
export function getVentableAmount(kind: VentResourceKind): number {
  if (kind === 'crew') {
    return Math.max(0, getVentResourceAmount('crew') - SHIP_MIN_CREW_ONBOARD);
  }
  return getVentResourceAmount(kind);
}

export function canVentResource(kind: VentResourceKind): boolean {
  return getVentableAmount(kind) > 0;
}

function ventCargoUnits(amount: number): number {
  let remaining = amount;
  for (const item of [...cargo]) {
    if (remaining <= 0) break;
    const take = Math.min(item.quantity, remaining);
    reduceCargoItem(item.name, take);
    remaining -= take;
  }
  return amount - remaining;
}

/** Vent `amount` units from the ship. Returns units actually removed. */
export function applyVentResource(kind: VentResourceKind, amount: number): number {
  const available = getVentableAmount(kind);
  const toVent = Math.min(Math.max(0, Math.floor(amount)), available);
  if (toVent <= 0) return 0;

  switch (kind) {
    case 'fuel':
      setFuel(fuel - toVent);
      break;
    case 'o2':
      setO2(o2 - toVent);
      break;
    case 'power':
      setPower(power - toVent);
      break;
    case 'crew':
      setShipCrew(Math.max(SHIP_MIN_CREW_ONBOARD, shipCrew - toVent));
      break;
    case 'cargo':
      ventCargoUnits(toVent);
      break;
  }

  if (kind === 'fuel' || kind === 'o2') {
    queueVentParticles(kind, toVent);
  }
  if (kind === 'crew') {
    queueCrewEject(toVent);
  }

  notifyVentChanged();
  return toVent;
}
