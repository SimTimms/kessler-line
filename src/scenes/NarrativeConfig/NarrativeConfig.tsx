import { useEffect, useState } from 'react';
import AppContainer from '../../components/App/AppContainer';
import NarrativeConfigScene from './NarrativeConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { ScannerHUDElements } from '../../components/Huds/HUD/ScannerHUD';
import AllHuds from '../../components/Huds/AllHuds';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { resetCameraMode } from '../../context/CameraMode';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { spotlightOnRef } from '../../context/SpotlightState';
import { setNavHudEnabled } from '../../context/NavHud';
import { clearAllIncomingHails } from '../../context/IncomingHailState';
import { setCargo } from '../../context/Inventory';
import { NARRATIVE_STARTER_CARGO } from './narrativeSceneConfig';
import { DeathOverlay } from '../../components/Ship/DeathOverlay';
import AutosaveIndicator from '../../components/Huds/AutosaveIndicator';
import { NARRATIVE_SCANNER_INITIAL_POWERS } from './narrativeSceneConfig';
import { applyNarrativeScannerDefaults } from './helpers/applyNarrativeScannerDefaults';

const NARRATIVE_DISABLED_HUD_ELEMENTS = [ScannerHUDElements.RADIATION] as const;

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
    resetCameraMode('free');
    setNavHudEnabled(true);
    if (loadSave) {
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
