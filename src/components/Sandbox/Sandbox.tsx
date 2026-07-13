import { useCallback, useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import SandboxScene from './SandboxScene';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { resetAllSettlements } from '../../context/SettlementTracker';
import { clearAllIncomingHails } from '../../context/IncomingHailState';
import { DeathOverlay } from '../Ship/DeathOverlay';
import { resetTutorialAirRun } from './resetSandboxRun';
import AllHuds from '../Huds/AllHuds';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { tutorialNavViewModeRef } from '../TutorialShared/TutorialFollowCamera';
import { KEY_TOGGLE_MINIMAP } from '../../config/keybindings';
import SandboxHtmlMiniMap from '../Minimap/SandboxHtmlMiniMap';
import { clearAllRendezvous } from '../../context/RendezvousState';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { getScannerRange } from '../../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';

const SANDBOX_SCANNER_INITIAL_POWERS = {
  [ScannerHUDElements.DRIVE]: 2,
  [ScannerHUDElements.PROXIMITY]: 2,
  [ScannerHUDElements.MAGNET]: 2,
  [ScannerHUDElements.RADIO]: 5,
} as const;

function applySandboxScannerDefaults(): void {
  magneticOnRef.current = true;
  magneticScanRangeRef.current = getScannerRange('magnet', SANDBOX_SCANNER_INITIAL_POWERS.magnet);
  driveSignatureOnRef.current = true;
  driveSignatureRangeRef.current = getScannerRange('drive', SANDBOX_SCANNER_INITIAL_POWERS.drive);
  proximityScanOnRef.current = true;
  proximityScanRangeRef.current = getScannerRange(
    'proximity',
    SANDBOX_SCANNER_INITIAL_POWERS.proximity
  );
  radioOnRef.current = true;
  radioRangeRef.current = getScannerRange('radio', SANDBOX_SCANNER_INITIAL_POWERS.radio);
}

export default function Sandbox() {
  const [deathOverlayKey, setDeathOverlayKey] = useState(0);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(true);
  const [driveSignatureOn, setDriveSignatureOn] = useState(true);
  const [proximity, setProximity] = useState(true);
  const [radioOn, setRadioOn] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialNavViewModeRef.current = false;
    resetScannerRefs();
    applySandboxScannerDefaults();
    clearAllIncomingHails();
    resetAllSettlements();
    clearAllRendezvous();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== KEY_TOGGLE_MINIMAP || e.repeat) return;
      e.preventDefault();
      setShowMinimap((v) => !v);
    };
    const onOpenMinimap = () => setShowMinimap(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-minimap', onOpenMinimap);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-minimap', onOpenMinimap);
    };
  }, []);

  const restartTutorial = useCallback(() => {
    resetTutorialAirRun();
    resetScannerRefs();
    applySandboxScannerDefaults();
    clearAllIncomingHails();
    resetAllSettlements();
    clearAllRendezvous();
    setSpotlightOn(false);
    setMagneticOn(true);
    setDriveSignatureOn(true);
    setProximity(true);
    setRadioOn(true);
    setDeathOverlayKey((k) => k + 1);
  }, []);

  return (
    <AppContainer>
      <NavHudKeyBinding />
      <SandboxScene />
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
        scannerInitialPowers={SANDBOX_SCANNER_INITIAL_POWERS}
      />
      {showMinimap && <SandboxHtmlMiniMap onClose={() => setShowMinimap(false)} />}
      <DeathOverlay
        key={deathOverlayKey}
        restartLabel="Restart Tutorial"
        onRestart={restartTutorial}
      />
    </AppContainer>
  );
}
