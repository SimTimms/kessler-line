export const radioOnRef: { current: boolean } = { current: false };
export const radioRangeRef: { current: number } = { current: 0 }; // 0 = off

/** Radio scanner is on with a non-zero range (level > 1 in ScannerHUD). */
export function isRadioScannerActive(): boolean {
  return radioOnRef.current && radioRangeRef.current > 0;
}

/** True if the radio is actively powered and `dist` is within the current active range. */
export function isWithinRadioRange(dist: number): boolean {
  return isRadioScannerActive() && dist <= radioRangeRef.current;
}

/**
 * Maximum radio range (level 4 = 4M units × 5 range multiplier = 20M units).
 * Must stay in sync with SCANNER_RANGE_CONFIG.radio in scanRanges.ts.
 * Computed here to avoid a circular dependency (scanRanges imports radioOnRef).
 */
const MAX_RADIO_RANGE = 4_000_000 * 5;

/** Maximum radio range (level 4 with multiplier). Always-on passive reception range. */
export function getMaxRadioRange(): number {
  return MAX_RADIO_RANGE;
}

/** True if dist is within the passive radio reception range (max hardware range). */
export function isWithinPassiveRadioRange(dist: number): boolean {
  return dist <= MAX_RADIO_RANGE;
}
