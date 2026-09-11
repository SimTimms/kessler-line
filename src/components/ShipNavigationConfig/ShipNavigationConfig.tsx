import { useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import SandboxHtmlMiniMap from '../Minimap/SandboxHtmlMiniMap';
import ShipNavigationConfigScene from './ShipNavigationConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { setNavHudEnabled } from '../../context/NavHud';
import { tutorialNavViewModeRef } from '../TutorialShared/TutorialFollowCamera';
import { resetCameraMode } from '../../context/CameraMode';
import { KEY_TOGGLE_MINIMAP } from '../../config/keybindings';

export default function ShipNavigationConfig() {
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
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          fontSize: '10px',
          backgroundColor: 'black',
          padding: '10px',
        }}
      >
        <SandboxHtmlMiniMap showSolarSystem />
      </div>
    </AppContainer>
  );
}
