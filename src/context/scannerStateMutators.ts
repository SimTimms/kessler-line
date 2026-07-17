import { magneticOnRef, magneticScanRangeRef } from './MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from './DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from './ProximityScan';
import { radioOnRef, radioRangeRef } from './RadioState';
import { radiationOnRef, radiationRangeRef } from './RadiationScan';
import {
  clampScannerPowerLevel,
  getScannerRange,
  isScannerPowerOn,
  scannerPowerLevelRefs,
} from '../config/scanRanges';

export function setMagneticScannerState(on: boolean, level: number): void {
  const clamped = clampScannerPowerLevel(level);
  const active = on && isScannerPowerOn(clamped);
  magneticOnRef.current = active;
  scannerPowerLevelRefs.magnet.current = active ? clamped : 1;
  magneticScanRangeRef.current = active ? getScannerRange('magnet', clamped) : 0;
}

export function setDriveScannerState(on: boolean, level: number): void {
  const clamped = clampScannerPowerLevel(level);
  const active = on && isScannerPowerOn(clamped);
  driveSignatureOnRef.current = active;
  scannerPowerLevelRefs.drive.current = active ? clamped : 1;
  driveSignatureRangeRef.current = active ? getScannerRange('drive', clamped) : 0;
}

export function setProximityScannerState(on: boolean, level: number): void {
  const clamped = clampScannerPowerLevel(level);
  const active = on && isScannerPowerOn(clamped);
  proximityScanOnRef.current = active;
  scannerPowerLevelRefs.proximity.current = active ? clamped : 1;
  proximityScanRangeRef.current = active ? getScannerRange('proximity', clamped) : 0;
}

export function setRadioScannerState(on: boolean, level: number): void {
  const clamped = clampScannerPowerLevel(level);
  const active = on && isScannerPowerOn(clamped);
  radioOnRef.current = active;
  scannerPowerLevelRefs.radio.current = active ? clamped : 1;
  radioRangeRef.current = active ? getScannerRange('radio', clamped) : 0;
}

export function setRadiationScannerState(on: boolean, level: number): void {
  const clamped = clampScannerPowerLevel(level);
  const active = on && isScannerPowerOn(clamped);
  radiationOnRef.current = active;
  scannerPowerLevelRefs.radiation.current = active ? clamped : 1;
  radiationRangeRef.current = active ? getScannerRange('radiation', clamped) : 0;
}
