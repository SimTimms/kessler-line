import { KM_PER_UNIT } from '../../../config/commsConfig';
import type { NavScanContact } from './navScanPickerContacts';
import type { NavTargetItem } from './NavTargetDialog';

export function formatDist(distUnits: number): string {
  const km = distUnits * KM_PER_UNIT;
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} Gm`;
  if (km >= 1_000) return `${(km / 1_000).toFixed(1)} Mm`;
  return `${km.toFixed(0)} km`;
}

export function contactListSignature(contacts: { id: string; distance: string }[]): string {
  return contacts
    .map((c) => `${c.id}:${c.distance}`)
    .sort()
    .join('|');
}

export function toNavTargetItems(contacts: NavScanContact[]): NavTargetItem[] {
  return contacts.map((c) => ({
    id: c.id,
    label: c.label,
    sublabel: c.sublabel,
    distance: c.distance,
  }));
}
