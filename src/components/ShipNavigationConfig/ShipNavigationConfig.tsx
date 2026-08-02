import { useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import AllHuds from '../Huds/AllHuds';
import SandboxHtmlMiniMap from '../Minimap/SandboxHtmlMiniMap';
import ShipNavigationConfigScene from './ShipNavigationConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import { getScannerRange } from '../../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { spotlightOnRef } from '../../context/SpotlightState';
import { setNavHudEnabled } from '../../context/NavHud';
import { tutorialNavViewModeRef } from '../TutorialShared/TutorialFollowCamera';
import { resetCameraMode } from '../../context/CameraMode';
import { KEY_TOGGLE_MINIMAP } from '../../config/keybindings';

const SHIP_NAV_SCANNER_INITIAL_POWERS = {
  [ScannerHUDElements.DRIVE]: 2,
  [ScannerHUDElements.PROXIMITY]: 2,
  [ScannerHUDElements.MAGNET]: 2,
  [ScannerHUDElements.RADIO]: 2,
  [ScannerHUDElements.RADIATION]: 1,
  [ScannerHUDElements.SPOTLIGHT]: 1,
} as const;

const SHIP_NAV_DISABLED_HUD_ELEMENTS = [
  ScannerHUDElements.RADIATION,
  ScannerHUDElements.SPOTLIGHT,
] as const;

function applyShipNavigationScannerDefaults(): void {
  spotlightOnRef.current = false;
  magneticOnRef.current = true;
  magneticScanRangeRef.current = getScannerRange('magnet', SHIP_NAV_SCANNER_INITIAL_POWERS.magnet);
  driveSignatureOnRef.current = true;
  driveSignatureRangeRef.current = getScannerRange('drive', SHIP_NAV_SCANNER_INITIAL_POWERS.drive);
  proximityScanOnRef.current = true;
  proximityScanRangeRef.current = getScannerRange(
    'proximity',
    SHIP_NAV_SCANNER_INITIAL_POWERS.proximity
  );
  radioOnRef.current = true;
  radioRangeRef.current = getScannerRange('radio', SHIP_NAV_SCANNER_INITIAL_POWERS.radio);
}

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
    applyShipNavigationScannerDefaults();
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
      <NavHudKeyBinding />
      <ShipNavigationConfigScene gravityEnabled={gravityEnabled} />
      <div
        style={{
          position: 'fixed',
          top: 144,
          left: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '8px 10px',
          border: '1px solid rgba(80, 170, 255, 0.45)',
          background: 'rgba(2, 12, 24, 0.72)',
          color: 'rgba(210, 235, 255, 0.95)',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          pointerEvents: 'auto',
          zIndex: 9999,
        }}
      >
        <div>Gravity {gravityEnabled ? 'ON' : 'OFF'}</div>
        <button
          type="button"
          style={{
            border: '1px solid rgba(120, 190, 255, 0.55)',
            background: 'rgba(8, 22, 38, 0.8)',
            color: 'rgba(220, 240, 255, 0.95)',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'inherit',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
          onClick={() => setGravityEnabled((v) => !v)}
        >
          {gravityEnabled ? 'Disable' : 'Enable'}
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
      {showMinimap && <SandboxHtmlMiniMap onClose={() => setShowMinimap(false)} showSolarSystem={false} />}
    </AppContainer>
  );
}
