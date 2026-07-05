import { magneticOnRef, magneticScanRangeRef } from './MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from './DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from './ProximityScan';
import { radioOnRef, radioRangeRef } from './RadioState';
import { radiationOnRef, radiationRangeRef } from './RadiationScan';
import { getScannerRange } from '../config/scanRanges';

export function setMagneticScannerState(on: boolean, level: number): void {
  magneticOnRef.current = on;
  magneticScanRangeRef.current = getScannerRange('magnet', level);
}

export function setDriveScannerState(on: boolean, level: number): void {
  driveSignatureOnRef.current = on;
  driveSignatureRangeRef.current = getScannerRange('drive', level);
}

export function setProximityScannerState(on: boolean, level: number): void {
  proximityScanOnRef.current = on;
  proximityScanRangeRef.current = getScannerRange('proximity', level);
}

export function setRadioScannerState(on: boolean, level: number): void {
  radioOnRef.current = on;
  radioRangeRef.current = getScannerRange('radio', level);
}

export function setRadiationScannerState(on: boolean, level: number): void {
  radiationOnRef.current = on;
  radiationRangeRef.current = getScannerRange('radiation', level);
}
