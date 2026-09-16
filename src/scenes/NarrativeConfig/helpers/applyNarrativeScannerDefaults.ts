import { getScannerRange } from '../../../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from '../../../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../../context/RadioState';
import { NARRATIVE_SCANNER_INITIAL_POWERS } from '../narrativeSceneConfig';
import { spotlightOnRef } from '../../../context/SpotlightState';

export function applyNarrativeScannerDefaults(): void {
  spotlightOnRef.current = false;
  magneticOnRef.current = true;
  magneticScanRangeRef.current = getScannerRange('magnet', NARRATIVE_SCANNER_INITIAL_POWERS.magnet);
  driveSignatureOnRef.current = true;
  driveSignatureRangeRef.current = getScannerRange('drive', NARRATIVE_SCANNER_INITIAL_POWERS.drive);
  proximityScanOnRef.current = true;
  proximityScanRangeRef.current = getScannerRange(
    'proximity',
    NARRATIVE_SCANNER_INITIAL_POWERS.proximity
  );
  radioOnRef.current = true;
  radioRangeRef.current = getScannerRange('radio', NARRATIVE_SCANNER_INITIAL_POWERS.radio);
}
