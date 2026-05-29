import { magneticOnRef, magneticScanRangeRef } from '../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../context/RadioState';
import { radiationOnRef, radiationRangeRef } from '../context/RadiationScan';

/** Matches `ScannerHUDElements` ids (except spotlight, which has no range). */
export type ScannerRangeId = 'proximity' | 'magnet' | 'drive' | 'radio' | 'radiation';

/** Shared helmet / nav HUD cyan for all scanner UI and range rings. */
export const HUD_SCANNER_ACCENT = '#00c8ff';

/** Short labels for scanner rows and nav contact count chips. */
export const SCANNER_ABBREV: Record<ScannerRangeId | 'spotlight', string> = {
  spotlight: 'LGT',
  magnet: 'MAG',
  drive: 'DRV',
  proximity: 'PRX',
  radio: 'RAD',
  radiation: 'RDN',
};

export interface ScannerRangeConfig {
  id: ScannerRangeId;
  /** World-unit range per HUD power level. Index 0 = off; levels 1–4 increase range. */
  ranges: readonly [number, number, number, number, number];
  /** Extra multiplier when writing the live range ref (radio only). */
  rangeMultiplier?: number;
  ring: {
    color: string;
    opacity: number;
    /** Small Y offset so multiple rings do not z-fight. */
    yOffset: number;
  };
}

/**
 * Single source of truth for scanner reach and range-ring visuals.
 * HUD power level `L` uses `ranges[L - 1]` (level 1 = off).
 */
export const SCANNER_RANGE_CONFIG: Record<ScannerRangeId, ScannerRangeConfig> = {
  proximity: {
    id: 'proximity',
    ranges: [0, 500, 1000, 1500, 3000],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.45, yOffset: 0 },
  },
  magnet: {
    id: 'magnet',
    ranges: [0, 500, 2_000, 50_000, 100_000],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.4, yOffset: 0.5 },
  },
  drive: {
    id: 'drive',
    ranges: [0, 1_000, 5_000, 2_000_000, 4_000_000],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.35, yOffset: 1 },
  },
  radio: {
    id: 'radio',
    ranges: [0, 200_000, 500_000, 2_000_000, 4_000_000],
    rangeMultiplier: 5,
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.35, yOffset: 2 },
  },
  radiation: {
    id: 'radiation',
    ranges: [0, 500, 2000, 5000, 10000],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.35, yOffset: 1.5 },
  },
};

/** World-unit range for HUD power level (1 = off). */
export function getScannerRange(id: ScannerRangeId, powerLevel: number): number {
  const { ranges, rangeMultiplier = 1 } = SCANNER_RANGE_CONFIG[id];
  const index = Math.max(0, Math.min(4, powerLevel - 1));
  return ranges[index] * rangeMultiplier;
}

// Legacy named exports (used across HUDs and tutorials).
export const SCAN_RANGES = SCANNER_RANGE_CONFIG.proximity.ranges;
export const MAGNETIC_RANGES = SCANNER_RANGE_CONFIG.magnet.ranges;
export const DRIVE_SIGNATURE_RANGES = SCANNER_RANGE_CONFIG.drive.ranges;
export const RADIO_RANGES = SCANNER_RANGE_CONFIG.radio.ranges;
export const RADIATION_RANGES = SCANNER_RANGE_CONFIG.radiation.ranges;

/** Range ring under the ship — wired to the same on/range refs as the HUD. */
export interface ScannerRangeRingDef {
  id: ScannerRangeId;
  color: string;
  opacity: number;
  yOffset: number;
  onRef: { current: boolean };
  rangeRef: { current: number };
}

export const SCANNER_RANGE_RING_DEFS: readonly ScannerRangeRingDef[] = [
  {
    id: 'proximity',
    ...SCANNER_RANGE_CONFIG.proximity.ring,
    onRef: proximityScanOnRef,
    rangeRef: proximityScanRangeRef,
  },
  {
    id: 'magnet',
    ...SCANNER_RANGE_CONFIG.magnet.ring,
    onRef: magneticOnRef,
    rangeRef: magneticScanRangeRef,
  },
  {
    id: 'drive',
    ...SCANNER_RANGE_CONFIG.drive.ring,
    onRef: driveSignatureOnRef,
    rangeRef: driveSignatureRangeRef,
  },
  {
    id: 'radiation',
    ...SCANNER_RANGE_CONFIG.radiation.ring,
    onRef: radiationOnRef,
    rangeRef: radiationRangeRef,
  },
  {
    id: 'radio',
    ...SCANNER_RANGE_CONFIG.radio.ring,
    onRef: radioOnRef,
    rangeRef: radioRangeRef,
  },
];

export const SCANNER_RANGE_RING_SEGMENTS = 128;

/** Default cyan for spotlight (no range ring). */
export const SCANNER_SPOTLIGHT_ACCENT = 'rgba(0, 207, 255, 0.92)';

/** Accent color for scanner HUD rows, nav scan chips, and picker dialogs. */
export function getScannerAccentColor(_scannerElementId?: string): string {
  return HUD_SCANNER_ACCENT;
}

/** Dimmed accent for scanner rows/buttons when the sensor is off. */
export function getScannerAccentColorDim(accentColor: string): string {
  return `color-mix(in srgb, ${accentColor} 40%, rgb(12, 20, 28))`;
}

/** Dimmed accent for unlit power segments while the sensor is on. */
export function getScannerAccentColorMuted(accentColor: string): string {
  return `color-mix(in srgb, ${accentColor} 28%, rgb(10, 18, 24))`;
}
