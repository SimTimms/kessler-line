import { spotlightOnRef } from './SpotlightState';
import { magneticOnRef, magneticScanRangeRef } from './MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from './DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from './ProximityScan';
import { radioOnRef, radioRangeRef } from './RadioState';
import { radiationOnRef, radiationRangeRef } from './RadiationScan';
import { SCANNER_OFF_LEVEL, scannerPowerLevelRefs } from '../config/scanRanges';

/** Reset module-level scanner refs (e.g. when entering sandbox from main game). */
export function resetScannerRefs(): void {
  spotlightOnRef.current = false;
  magneticOnRef.current = false;
  magneticScanRangeRef.current = 0;
  driveSignatureOnRef.current = false;
  driveSignatureRangeRef.current = 0;
  proximityScanOnRef.current = false;
  proximityScanRangeRef.current = 0;
  radioOnRef.current = false;
  radioRangeRef.current = 0;
  radiationOnRef.current = false;
  radiationRangeRef.current = 0;
  (Object.keys(scannerPowerLevelRefs) as (keyof typeof scannerPowerLevelRefs)[]).forEach((id) => {
    scannerPowerLevelRefs[id].current = SCANNER_OFF_LEVEL;
  });
}
