import type { ScannerRangeId } from '../config/scanRanges';

/** Live in-range contact counts, written by NavHUD each scan pass. */
export const scannerContactCountRefs: Record<ScannerRangeId, { current: number }> = {
  magnet: { current: 0 },
  drive: { current: 0 },
  proximity: { current: 0 },
  radio: { current: 0 },
  radiation: { current: 0 },
};

export function setScannerContactCount(id: ScannerRangeId, count: number): void {
  scannerContactCountRefs[id].current = Math.max(0, count);
}

export function clearScannerContactCounts(): void {
  (Object.keys(scannerContactCountRefs) as ScannerRangeId[]).forEach((id) => {
    scannerContactCountRefs[id].current = 0;
  });
}

export function formatScannerContactCount(count: number): string {
  return `${Math.max(0, count)}`;
}
