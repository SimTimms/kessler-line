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
import GhostFleet from '../NPCs/GhostFleet';

export default function Sandbox() {
  const [deathOverlayKey, setDeathOverlayKey] = useState(0);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialNavViewModeRef.current = false;
    resetScannerRefs();
    clearAllIncomingHails();
    resetAllSettlements();
  }, []);

  const restartTutorial = useCallback(() => {
    resetTutorialAirRun();
    resetScannerRefs();
    clearAllIncomingHails();
    resetAllSettlements();
    setSpotlightOn(false);
    setMagneticOn(false);
    setDriveSignatureOn(false);
    setProximity(false);
    setRadioOn(false);
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
      />
      <GhostFleet />
      <DeathOverlay
        key={deathOverlayKey}
        restartLabel="Restart Tutorial"
        onRestart={restartTutorial}
      />
    </AppContainer>
  );
}
