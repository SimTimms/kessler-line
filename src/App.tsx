import './App.css';
import { AppShell } from './components/App';
import AppContainer from './components/App/AppContainer';
import AppStyles from './components/App/AppStyles';
import StartOverlay, { type TutorialMenuSelection } from './components/App/StartOverlay';
import { useAppLifecycle, useAppState } from './hooks';
import { resumeAudioContext } from './sound/SoundManager';
import { useCallback, useState } from 'react';
import TutorialShell from './components/Tutorial/TutorialShell';
import { tutorialStepRef } from './context/TutorialState';
import {
  shipVelocity,
  setHullIntegrity,
  setFuel,
  setO2,
  shipDestroyed,
  mainEngineDisabled,
} from './context/ShipState';
import { shipPosRef } from './context/ShipPos';

type AppMode = 'start' | 'tutorial' | 'game';
type TutorialMode = TutorialMenuSelection;

// Full reset of module-level ship state so the tutorial always starts clean,
// regardless of what happened in the main game (destroyed ship, engine damage, etc.)
function resetShipState() {
  shipVelocity.set(0, 0, 0);
  shipPosRef.current.set(0, 0, 0);
  setHullIntegrity(100);
  setFuel(100);
  setO2(100);
  shipDestroyed.current = false;
  mainEngineDisabled.reverseA.current = false;
  mainEngineDisabled.reverseB.current = false;
}

function App() {
  useAppLifecycle();
  const { hud, docking, beacon, mission, thrust } = useAppState();
  const [mode, setMode] = useState<AppMode>('start');
  const [tutorialMode, setTutorialMode] = useState<TutorialMode>('general-movement');
  const [showShipTitle, setShowShipTitle] = useState(false);

  const handleStart = useCallback(() => {
    resumeAudioContext();
    setMode('game');
    setShowShipTitle(true);
  }, []);

  const handleTutorialSelect = useCallback((selection: TutorialMode) => {
    resumeAudioContext();
    resetShipState();
    tutorialStepRef.current = 0;
    setTutorialMode(selection);
    setMode('tutorial');
  }, []);

  const handleTutorialComplete = useCallback(() => {
    resetShipState();
    tutorialStepRef.current = 0;
    setMode('game');
    setShowShipTitle(true);
  }, []);

  const handleShipTitleDone = useCallback(() => {
    setShowShipTitle(false);
  }, []);

  if (mode === 'start') {
    return (
      <AppContainer>
        <StartOverlay onStart={handleStart} onTutorialSelect={handleTutorialSelect} />
        <AppStyles />
      </AppContainer>
    );
  }

  if (mode === 'tutorial') {
    return <TutorialShell onComplete={handleTutorialComplete} tutorialMode={tutorialMode} />;
  }

  return (
    <AppShell
      spotlightOn={hud.spotlightOn}
      setSpotlightOn={hud.setSpotlightOn}
      magneticOn={hud.magneticOn}
      setMagneticOn={hud.setMagneticOn}
      driveSignatureOn={hud.driveSignatureOn}
      setDriveSignatureOn={hud.setDriveSignatureOn}
      proximity={hud.proximity}
      setProximity={hud.setProximity}
      radioOn={hud.radioOn}
      setRadioOn={hud.setRadioOn}
      showMinimap={hud.showMinimap}
      docked={docking.docked}
      dockedStation={docking.dockedStation}
      activeMission={mission.activeMission}
      completedMissions={mission.completedMissions}
      refueling={docking.refueling}
      transferringO2={docking.transferringO2}
      onRefuel={docking.onRefuel}
      onTransferO2={docking.onTransferO2}
      onMissionSelect={mission.onMissionSelect}
      onMissionComplete={mission.onMissionComplete}
      beaconActivated={beacon.beaconActivated}
      listeningToMessage={beacon.listeningToMessage}
      setListeningToMessage={beacon.setListeningToMessage}
      activeAudioRef={beacon.activeAudioRef}
      thrustLevel={thrust.thrustLevel}
      setThrustLevel={thrust.setThrustLevel}
      showStartOverlay={false}
      onStart={handleStart}
      onTutorial={() => handleTutorialSelect('general-movement')}
      showShipTitle={showShipTitle}
      onShipTitleDone={handleShipTitleDone}
    />
  );
}

export default App;
