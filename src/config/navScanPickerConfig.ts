import type { ScannerRangeId } from './scanRanges';
import { getScannerAccentColor } from './scanRanges';

/** Scanner ids used for nav contact picker buttons (excludes spotlight). */
export type NavScanPickerId = ScannerRangeId;

export interface NavScanPickerTheme {
  id: NavScanPickerId;
  title: string;
  emptyMessage: string;
  headerBrand: string;
  color: string;
  pickerTitle: string;
}

const PICKER_META: Record<
  NavScanPickerId,
  Omit<NavScanPickerTheme, 'id' | 'color'> & { sectionLabel?: string }
> = {
  magnet: {
    title: 'SELECT MAGNETIC CONTACT',
    emptyMessage: 'NO MAGNETIC CONTACTS IN RANGE',
    headerBrand: '⊕ MERIDIAN / MAGSCAN',
    pickerTitle: 'Magnetic contacts',
  },
  drive: {
    title: 'SELECT DRIVE CONTACT',
    emptyMessage: 'NO DRIVE SIGNATURES IN RANGE',
    headerBrand: '⊕ MERIDIAN / DRVSCAN',
    pickerTitle: 'Drive signatures',
  },
  proximity: {
    title: 'SELECT PROXIMITY CONTACT',
    emptyMessage: 'NO PROXIMITY CONTACTS IN RANGE',
    headerBrand: '⊕ MERIDIAN / PRXSCAN',
    pickerTitle: 'Proximity contacts',
  },
  radio: {
    title: 'SELECT RADIO BEACON',
    emptyMessage: 'NO RADIO BEACONS IN RANGE',
    headerBrand: '⊕ MERIDIAN / RADSCAN',
    pickerTitle: 'Radio beacons',
  },
  radiation: {
    title: 'SELECT RADIATION SOURCE',
    emptyMessage: 'NO RADIATION SOURCES IN RANGE',
    headerBrand: '⊕ MERIDIAN / RDNSCAN',
    pickerTitle: 'Radiation sources',
  },
};

/** Display order along the helmet nav target row (after TGT, before AP). */
export const NAV_SCAN_PICKER_ORDER: readonly NavScanPickerId[] = [
  'magnet',
  'drive',
  'proximity',
  'radio',
  'radiation',
];

export function getNavScanPickerTheme(id: NavScanPickerId): NavScanPickerTheme {
  const meta = PICKER_META[id];
  return {
    id,
    color: getScannerAccentColor(id),
    ...meta,
  };
}

export function isNavScanPickerVariant(
  variant: string,
): variant is NavScanPickerId {
  return variant in PICKER_META;
}
