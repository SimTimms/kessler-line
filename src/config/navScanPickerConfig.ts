import type { ScannerRangeId } from './scanRanges';
import { HUD_SCANNER_ACCENT, SCANNER_ABBREV } from './scanRanges';

/** Scanner ids used for nav contact picker buttons (excludes spotlight). */
export type NavScanPickerId = ScannerRangeId;

export interface NavScanPickerTheme {
  id: NavScanPickerId;
  abbrev: string;
  title: string;
  emptyMessage: string;
  headerBrand: string;
  color: string;
  pickerTitle: string;
}

const SCANNER = {
  magnet: 'magnet',
  drive: 'drive',
  proximity: 'proximity',
  radio: 'radio',
  radiation: 'radiation',
} as const satisfies Record<string, NavScanPickerId>;

const PICKER_META: Record<
  NavScanPickerId,
  Omit<NavScanPickerTheme, 'id' | 'color' | 'abbrev'> & { sectionLabel?: string }
> = {
  [SCANNER.magnet]: {
    title: 'SELECT MAGNETIC CONTACT',
    emptyMessage: 'NO MAGNETIC CONTACTS IN RANGE',
    headerBrand: '⊕ MERIDIAN / MAGSCAN',
    pickerTitle: 'Magnetic contacts',
  },
  [SCANNER.drive]: {
    title: 'SELECT DRIVE CONTACT',
    emptyMessage: 'NO DRIVE SIGNATURES IN RANGE',
    headerBrand: '⊕ MERIDIAN / DRVSCAN',
    pickerTitle: 'Drive signatures',
  },
  [SCANNER.proximity]: {
    title: 'SELECT PROXIMITY CONTACT',
    emptyMessage: 'NO PROXIMITY CONTACTS IN RANGE',
    headerBrand: '⊕ MERIDIAN / PRXSCAN',
    pickerTitle: 'Proximity contacts',
  },
  [SCANNER.radio]: {
    title: 'SELECT RADIO BEACON',
    emptyMessage: 'NO RADIO BEACONS IN RANGE',
    headerBrand: '⊕ MERIDIAN / RADSCAN',
    pickerTitle: 'Radio beacons',
  },
  [SCANNER.radiation]: {
    title: 'SELECT RADIATION SOURCE',
    emptyMessage: 'NO RADIATION SOURCES IN RANGE',
    headerBrand: '⊕ MERIDIAN / RDNSCAN',
    pickerTitle: 'Radiation sources',
  },
};

/** Display order along the helmet nav target row (after TGT, before AP). */
export const NAV_SCAN_PICKER_ORDER: readonly NavScanPickerId[] = [
  SCANNER.magnet,
  SCANNER.drive,
  SCANNER.proximity,
  SCANNER.radio,
  SCANNER.radiation,
];

export function getNavScanPickerTheme(id: NavScanPickerId): NavScanPickerTheme {
  const meta = PICKER_META[id];
  return {
    id,
    abbrev: SCANNER_ABBREV[id],
    color: HUD_SCANNER_ACCENT,
    ...meta,
  };
}

export function isNavScanPickerVariant(variant: string): variant is NavScanPickerId {
  return variant in PICKER_META;
}
