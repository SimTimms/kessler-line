import { useEffect, useState } from 'react';
import AppContainer from '../../components/App/AppContainer';
import NarrativeConfigScene from './NarrativeConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { ScannerHUDElements } from '../../components/Huds/HUD/ScannerHUD';
import AllHuds from '../../components/Huds/AllHuds';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { tutorialNavViewModeRef } from '../../components/TutorialShared/TutorialFollowCamera';
import { resetCameraMode } from '../../context/CameraMode';
import { getScannerRange } from '../../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { spotlightOnRef } from '../../context/SpotlightState';
import { setNavHudEnabled } from '../../context/NavHud';
import { clearAllIncomingHails } from '../../context/IncomingHailState';
import { setCargo } from '../../context/Inventory';
import { NARRATIVE_STARTER_CARGO } from './narrativeSceneConfig';
import { DeathOverlay } from '../../components/Ship/DeathOverlay';
import AutosaveIndicator from '../../components/Huds/AutosaveIndicator';

const NARRATIVE_SCANNER_INITIAL_POWERS = {
  [ScannerHUDElements.DRIVE]: 2,
  [ScannerHUDElements.PROXIMITY]: 2,
  [ScannerHUDElements.MAGNET]: 2,
  [ScannerHUDElements.RADIO]: 2,
  [ScannerHUDElements.RADIATION]: 1,
  [ScannerHUDElements.SPOTLIGHT]: 1,
} as const;

const NARRATIVE_DISABLED_HUD_ELEMENTS = [ScannerHUDElements.RADIATION] as const;

function applyNarrativeScannerDefaults(): void {
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

interface NarrativeConfigProps {
  loadSave?: boolean;
}

export default function NarrativeConfig({ loadSave }: NarrativeConfigProps) {
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(true);
  const [driveSignatureOn, setDriveSignatureOn] = useState(true);
  const [proximity, setProximity] = useState(true);
  const [radioOn, setRadioOn] = useState(true);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialNavViewModeRef.current = false;
    resetCameraMode('free');
    setNavHudEnabled(true);
    if (loadSave) {
      // apply() already restored scanner refs — sync React state from them
      setSpotlightOn(spotlightOnRef.current);
      setMagneticOn(magneticOnRef.current);
      setDriveSignatureOn(driveSignatureOnRef.current);
      setProximity(proximityScanOnRef.current);
      setRadioOn(radioOnRef.current);
    } else {
      resetScannerRefs();
      applyNarrativeScannerDefaults();
      clearAllIncomingHails();
      setCargo([...NARRATIVE_STARTER_CARGO]);
    }
  }, [loadSave]);

  return (
    <AppContainer>
      <NarrativeConfigScene loadSave={loadSave} />
      <AllHuds
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        proximity={proximity}
        setProximity={setProximity}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        disabledHudElementsState={[...NARRATIVE_DISABLED_HUD_ELEMENTS]}
        scannerInitialPowers={NARRATIVE_SCANNER_INITIAL_POWERS}
      />
      <DeathOverlay respawnEnabled />
      <AutosaveIndicator />
    </AppContainer>
  );
}
