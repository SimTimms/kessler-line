import type { ScannerRangeId } from '../config/scanRanges';

type HoverRef = { current: boolean };
type ScannerRingHoverRefs = Record<ScannerRangeId, HoverRef>;

export const scannerRingHoverRefs: ScannerRingHoverRefs = {
  proximity: { current: false },
  magnet: { current: false },
  drive: { current: false },
  radio: { current: false },
  radiation: { current: false },
};

export function setScannerRingHovered(id: ScannerRangeId, hovered: boolean): void {
  scannerRingHoverRefs[id].current = hovered;
}

export function isScannerRingHovered(id: ScannerRangeId): boolean {
  return scannerRingHoverRefs[id].current;
}

export function resetScannerRingHoverState(): void {
  scannerRingHoverRefs.proximity.current = false;
  scannerRingHoverRefs.magnet.current = false;
  scannerRingHoverRefs.drive.current = false;
  scannerRingHoverRefs.radio.current = false;
  scannerRingHoverRefs.radiation.current = false;
}
