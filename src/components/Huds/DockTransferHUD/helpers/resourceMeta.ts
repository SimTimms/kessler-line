import { Droplets, Wind, Zap, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fuel, o2, power, shipCrew } from '../../../../context/ShipState';
import {
  SHIP_CREW_CAPACITY,
  SHIP_RESOURCE_MAX,
} from '../../../../config/dockTransferConfig';
import {
  readPartnerAmount,
  readPartnerCapacity,
  type DockableResourceKind,
} from '../../../../context/DockablePartnerStore';
import type { TransferDirection } from './dockTransferTypes';

export const RESOURCE_META: Record<
  DockableResourceKind,
  { label: string; icon: LucideIcon; shipMax: number }
> = {
  fuel: { label: 'Fuel', icon: Droplets, shipMax: SHIP_RESOURCE_MAX },
  o2: { label: 'O2', icon: Wind, shipMax: SHIP_RESOURCE_MAX },
  power: { label: 'Pwr', icon: Zap, shipMax: SHIP_RESOURCE_MAX },
  crew: { label: 'Crew', icon: User, shipMax: SHIP_CREW_CAPACITY },
};

/** Current ship-side amount of a resource. Read live on every call. */
export function shipValue(kind: DockableResourceKind): number {
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

/** True when there is something to send and room to receive it. */
export function canTransfer(
  partnerId: string,
  kind: DockableResourceKind,
  direction: TransferDirection
): boolean {
  const meta = RESOURCE_META[kind];
  const shipVal = shipValue(kind);
  const partnerVal = readPartnerAmount(partnerId, kind);
  const partnerCap = readPartnerCapacity(partnerId, kind);
  if (direction === 'toPartner') {
    return shipVal > 0 && partnerVal < partnerCap;
  }
  return partnerVal > 0 && shipVal < meta.shipMax;
}
