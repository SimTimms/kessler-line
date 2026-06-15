export const radioOnRef: { current: boolean } = { current: false };
export const radioRangeRef: { current: number } = { current: 0 }; // 0 = off

/** Radio scanner is on with a non-zero range (level > 1 in ScannerHUD). */
export function isRadioScannerActive(): boolean {
  return radioOnRef.current && radioRangeRef.current > 0;
}

export function isWithinRadioRange(dist: number): boolean {
  return isRadioScannerActive() && dist <= radioRangeRef.current;
}
