import type { ScannerRangeId } from '../../../config/scanRanges';
import type { NavScanContact } from '../NavHUD/navScanPickerContacts';
import type { NavTargetItem } from '../NavHUD/NavTargetDialog';

/**
 * Module-level store for scanner contacts and planet nav items.
 * Written by navHudContactScanner, read by EventLogHUD tabs.
 * Follows the same subscribe/notify pattern as EventLogStore.
 */

const listeners = new Set<() => void>();

let contactsByScanner: Record<ScannerRangeId, NavScanContact[]> = {
  magnet: [],
  drive: [],
  proximity: [],
  radio: [],
  radiation: [],
};

let planetItems: NavTargetItem[] = [];

function notify() {
  for (const fn of listeners) fn();
}

export function setContactStoreContacts(scannerId: ScannerRangeId, contacts: NavScanContact[]): void {
  contactsByScanner = { ...contactsByScanner, [scannerId]: contacts };
  notify();
}

export function setContactStorePlanets(items: NavTargetItem[]): void {
  planetItems = items;
  notify();
}

export function getContactsByScanner(): Record<ScannerRangeId, NavScanContact[]> {
  return contactsByScanner;
}

export function getPlanetItems(): NavTargetItem[] {
  return planetItems;
}

export function subscribeContactStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
