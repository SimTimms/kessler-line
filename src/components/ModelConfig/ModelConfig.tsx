import { useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import ModelConfigScene from './ModelConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { ScannerHUD, ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import SharedScannerOverlayHuds from '../Huds/SharedScannerOverlayHuds';
import ContactsHUD from '../ContactsHUD/ContactsHUD';
import DockTransferHUD from '../Huds/DockTransferHUD/DockTransferHUD';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { getScannerRange } from '../../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { spotlightOnRef } from '../../context/SpotlightState';
import { setNavHudEnabled } from '../../context/NavHud';

const MODEL_CONFIG_SCANNER_INITIAL_POWERS = {
  [ScannerHUDElements.DRIVE]: 2,
  [ScannerHUDElements.PROXIMITY]: 2,
  [ScannerHUDElements.MAGNET]: 2,
  [ScannerHUDElements.RADIO]: 1,
  [ScannerHUDElements.RADIATION]: 1,
  [ScannerHUDElements.SPOTLIGHT]: 1,
} as const;

const MODEL_CONFIG_DISABLED_HUD_ELEMENTS = [
  ScannerHUDElements.SPOTLIGHT,
  ScannerHUDElements.RADIO,
  ScannerHUDElements.RADIATION,
] as const;

function applyModelConfigScannerDefaults(): void {
  spotlightOnRef.current = false;
  magneticOnRef.current = true;
  magneticScanRangeRef.current = getScannerRange(
    'magnet',
    MODEL_CONFIG_SCANNER_INITIAL_POWERS.magnet
  );
  driveSignatureOnRef.current = true;
  driveSignatureRangeRef.current = getScannerRange(
    'drive',
    MODEL_CONFIG_SCANNER_INITIAL_POWERS.drive
  );
  proximityScanOnRef.current = true;
  proximityScanRangeRef.current = getScannerRange(
    'proximity',
    MODEL_CONFIG_SCANNER_INITIAL_POWERS.proximity
  );
  radioOnRef.current = false;
  radioRangeRef.current = 0;
}

export default function ModelConfig() {
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(true);
  const [driveSignatureOn, setDriveSignatureOn] = useState(true);
  const [proximity, setProximity] = useState(true);
  const [radioOn, setRadioOn] = useState(false);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    setNavHudEnabled(false);
    resetScannerRefs();
    applyModelConfigScannerDefaults();
  }, []);

  return (
    <AppContainer>
      <ModelConfigScene />
      <ScannerHUD
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        spotlightOnRef={spotlightOnRef}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        magneticOnRef={magneticOnRef}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        driveSignatureOnRef={driveSignatureOnRef}
        proximity={proximity}
        setProximity={setProximity}
        proximityScanOnRef={proximityScanOnRef}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        radioOnRef={radioOnRef}
        disableElements={[...MODEL_CONFIG_DISABLED_HUD_ELEMENTS]}
        initialPowers={MODEL_CONFIG_SCANNER_INITIAL_POWERS}
      />
      <ContactsHUD sceneRadioContactsOnly />
      <DockTransferHUD />
      <SharedScannerOverlayHuds />
    </AppContainer>
  );
}
