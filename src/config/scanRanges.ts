import { magneticOnRef, magneticScanRangeRef } from '../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../context/RadioState';
import { radiationOnRef, radiationRangeRef } from '../context/RadiationScan';
import { spotlightOnRef } from '../context/SpotlightState';
import { scaleSystemPowerDrainPerSecond } from './damageConfig';

/** Matches `ScannerHUDElements` ids (except spotlight, which has no range). */
export type ScannerRangeId = 'proximity' | 'magnet' | 'drive' | 'radio' | 'radiation';

/** All scanner HUD element ids including spotlight. */
export type ScannerElementId = ScannerRangeId | 'spotlight';

/** Shared cyan for scanner UI and range rings (matches helmet HUD). */
export const HUD_SCANNER_ACCENT = '#00c8ff';

/** Short labels for scanner rows and nav contact count chips. */
export const SCANNER_ABBREV: Record<ScannerElementId, string> = {
  spotlight: 'LGT',
  magnet: 'MAG',
  drive: 'DRV',
  proximity: 'PRX',
  radio: 'RAD',
  radiation: 'RDN',
};

/**
 * HUD power levels: 1 = off, 2 = short, 3 = medium, 4 = long.
 * Index into ranges / drain arrays is `level - 1`.
 */
export const SCANNER_POWER_LEVELS = [1, 2, 3, 4] as const;
/** Range buttons shown in the HUD (excludes off — use the 0/I switch). */
export const SCANNER_RANGE_ON_LEVELS = [2, 3, 4] as const;
export type ScannerPowerLevel = (typeof SCANNER_POWER_LEVELS)[number];
export const MIN_SCANNER_POWER_LEVEL = 1;
export const MAX_SCANNER_POWER_LEVEL = 4;
export const SCANNER_OFF_LEVEL = 1;
export const SCANNER_DEFAULT_ON_LEVEL = 3; // medium

export const SCANNER_RANGE_MODE_LABELS: Record<ScannerPowerLevel, string> = {
  1: '0',
  2: '1',
  3: '2',
  4: '3',
};

export const SCANNER_RANGE_MODE_ARIA: Record<ScannerPowerLevel, string> = {
  1: 'Off',
  2: 'Short range',
  3: 'Medium range',
  4: 'Long range',
};

export function clampScannerPowerLevel(level: number): ScannerPowerLevel {
  return Math.max(
    MIN_SCANNER_POWER_LEVEL,
    Math.min(MAX_SCANNER_POWER_LEVEL, Math.round(level))
  ) as ScannerPowerLevel;
}

export function isScannerPowerOn(level: number): boolean {
  return clampScannerPowerLevel(level) > SCANNER_OFF_LEVEL;
}

export interface ScannerRangeConfig {
  id: ScannerRangeId;
  /** World-unit range per HUD power level. Index 0 = off; 1–3 = short/medium/long. */
  ranges: readonly [number, number, number, number];
  /**
   * Power drain per second at each level (same indexing as ranges).
   * Spotlight uses {@link SCANNER_SPOTLIGHT_POWER_DRAIN}.
   */
  powerDrain: readonly [number, number, number, number];
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
    ranges: [0, 500, 1500, 3000],
    powerDrain: [0, 0.1, 0.2, 0.4],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.45, yOffset: 0 },
  },
  magnet: {
    id: 'magnet',
    ranges: [0, 500, 50_000, 100_000],
    powerDrain: [0, 0.1, 2, 4],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.4, yOffset: 0.5 },
  },
  drive: {
    id: 'drive',
    ranges: [0, 500_000, 2_000_000, 10_000_000],
    powerDrain: [0, 0.1, 2, 4],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.35, yOffset: 1 },
  },
  radio: {
    id: 'radio',
    ranges: [0, 200_000, 500_000, 4_000_000],
    powerDrain: [0, 0.1, 0.2, 0.5],
    rangeMultiplier: 5,
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.35, yOffset: 2 },
  },
  radiation: {
    id: 'radiation',
    ranges: [0, 500, 2000, 10000],
    powerDrain: [0, 0.1, 2, 4],
    ring: { color: HUD_SCANNER_ACCENT, opacity: 0.35, yOffset: 1.5 },
  },
};

/** Spotlight has no world range; drain still scales with power mode. */
export const SCANNER_SPOTLIGHT_POWER_DRAIN: readonly [number, number, number, number] = [
  0, 0.1, 2, 3,
];

/** Live HUD power level per scanner (1 = off). Written by ScannerHUD / mutators. */
export const scannerPowerLevelRefs: Record<ScannerElementId, { current: number }> = {
  spotlight: { current: SCANNER_OFF_LEVEL },
  magnet: { current: SCANNER_OFF_LEVEL },
  drive: { current: SCANNER_OFF_LEVEL },
  proximity: { current: SCANNER_OFF_LEVEL },
  radio: { current: SCANNER_OFF_LEVEL },
  radiation: { current: SCANNER_OFF_LEVEL },
};

/** World-unit range for HUD power level (1 = off). */
export function getScannerRange(id: ScannerRangeId, powerLevel: number): number {
  const { ranges, rangeMultiplier = 1 } = SCANNER_RANGE_CONFIG[id];
  const index = clampScannerPowerLevel(powerLevel) - 1;
  return ranges[index] * rangeMultiplier;
}

/** Power drain per second for a scanner at the given HUD level. */
export function getScannerPowerDrain(id: ScannerElementId, powerLevel: number): number {
  const index = clampScannerPowerLevel(powerLevel) - 1;
  const base =
    id === 'spotlight'
      ? SCANNER_SPOTLIGHT_POWER_DRAIN[index]
      : SCANNER_RANGE_CONFIG[id].powerDrain[index];
  return scaleSystemPowerDrainPerSecond(base);
}

function isScannerElementActive(id: ScannerElementId): boolean {
  switch (id) {
    case 'spotlight':
      return spotlightOnRef.current;
    case 'magnet':
      return magneticOnRef.current && magneticScanRangeRef.current > 0;
    case 'drive':
      return driveSignatureOnRef.current && driveSignatureRangeRef.current > 0;
    case 'proximity':
      return proximityScanOnRef.current && proximityScanRangeRef.current > 0;
    case 'radio':
      return radioOnRef.current && radioRangeRef.current > 0;
    case 'radiation':
      return radiationOnRef.current && radiationRangeRef.current > 0;
    default:
      return false;
  }
}

/** Sum of power drain/sec for every scanner at its current live level. */
export function getTotalScannerPowerDrain(): number {
  let total = 0;
  (Object.keys(scannerPowerLevelRefs) as ScannerElementId[]).forEach((id) => {
    if (!isScannerElementActive(id)) return;
    total += getScannerPowerDrain(id, scannerPowerLevelRefs[id].current);
  });
  return total;
}

export function formatScannerPowerDrain(drainPerSec: number): string {
  if (drainPerSec <= 0) return '0';
  return `-${drainPerSec}`;
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

/** Keep spotlightOnRef in sync with power level bookkeeping. */
export function syncSpotlightPowerLevel(level: number): void {
  const clamped = clampScannerPowerLevel(level);
  scannerPowerLevelRefs.spotlight.current = clamped;
  spotlightOnRef.current = isScannerPowerOn(clamped);
}
