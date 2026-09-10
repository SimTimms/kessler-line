import { useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import AllHuds from '../Huds/AllHuds';
import SandboxHtmlMiniMap from '../Minimap/SandboxHtmlMiniMap';
import ShipNavigationConfigScene from './ShipNavigationConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { setNavHudEnabled } from '../../context/NavHud';
import { tutorialNavViewModeRef } from '../TutorialShared/TutorialFollowCamera';
import { resetCameraMode } from '../../context/CameraMode';
import { KEY_TOGGLE_MINIMAP } from '../../config/keybindings';

const SHIP_NAV_SCANNER_INITIAL_POWERS = {
  [ScannerHUDElements.DRIVE]: 0,
  [ScannerHUDElements.PROXIMITY]: 0,
  [ScannerHUDElements.MAGNET]: 0,
  [ScannerHUDElements.RADIO]: 0,
  [ScannerHUDElements.RADIATION]: 0,
  [ScannerHUDElements.SPOTLIGHT]: 0,
} as const;

const SHIP_NAV_DISABLED_HUD_ELEMENTS = [
  ScannerHUDElements.RADIATION,
  ScannerHUDElements.SPOTLIGHT,
] as const;

export default function ShipNavigationConfig() {
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(true);
  const [driveSignatureOn, setDriveSignatureOn] = useState(true);
  const [proximity, setProximity] = useState(true);
  const [radioOn, setRadioOn] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [gravityEnabled, setGravityEnabled] = useState(true);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialNavViewModeRef.current = false;
    resetCameraMode('free');
    setNavHudEnabled(true);
    resetScannerRefs();
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

  return (
    <AppContainer>
      <ShipNavigationConfigScene gravityEnabled={gravityEnabled} />
      <div className="mc-button-container">
        <div>Gravity {gravityEnabled ? 'ON' : 'OFF'}</div>
        <button
          type="button"
          className="mc-collision-test-button"
          onClick={() => setGravityEnabled((v) => !v)}
        >
          {gravityEnabled ? 'Gravity is On' : 'Gravity is Off'}
        </button>
      </div>
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
        disabledHudElementsState={[...SHIP_NAV_DISABLED_HUD_ELEMENTS]}
        scannerInitialPowers={SHIP_NAV_SCANNER_INITIAL_POWERS}
      />
      {showMinimap && <SandboxHtmlMiniMap showSolarSystem={false} />}
    </AppContainer>
  );
}
