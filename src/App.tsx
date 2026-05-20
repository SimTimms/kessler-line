import './App.css';
import { AppShell } from './components/App';
import { useAppLifecycle, useAppState } from './hooks';
import { resumeAudioContext } from './sound/SoundManager';
import { useCallback, useState } from 'react';
import TutorialMovement from './components/TutorialMovement/TutorialMovement';
import TutorialResources from './components/TutorialResources/TutorialResources';
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
import StartOverlay from './components/App/StartOverlay';
import { GAME_MODES, type GameMode, type TutorialMenuSelection } from './config/gameModes';

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
  const [mode, setMode] = useState<GameMode>(GAME_MODES.menu);
  const [tutorialMode, setTutorialMode] = useState<TutorialMenuSelection>(GAME_MODES.tutorial);
  const [showShipTitle, setShowShipTitle] = useState(false);

  const handleStart = useCallback(() => {
    resumeAudioContext();
    setMode(GAME_MODES.game);
    setShowShipTitle(true);
  }, []);

  const handleTutorialSelect = useCallback((selection: TutorialMenuSelection) => {
    resumeAudioContext();
    resetShipState();
    tutorialStepRef.current = 0;
    setTutorialMode(selection);
    setMode(selection);
  }, []);

  const handleTutorialComplete = useCallback(() => {
    resetShipState();
    tutorialStepRef.current = 0;
    setMode(GAME_MODES.game);
    setShowShipTitle(true);
  }, []);

  const handleShipTitleDone = useCallback(() => {
    setShowShipTitle(false);
  }, []);

  switch (mode) {
    case GAME_MODES.menu:
      return <StartOverlay onStart={handleStart} onTutorialSelect={handleTutorialSelect} />;
    case GAME_MODES.tutorial:
      return <TutorialMovement onComplete={handleTutorialComplete} tutorialMode={tutorialMode} />;
    case GAME_MODES.resources:
      return <TutorialResources onComplete={handleTutorialComplete} tutorialMode={tutorialMode} />;
    case GAME_MODES.game:
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
          onTutorial={() => handleTutorialSelect(GAME_MODES.tutorial)}
          showShipTitle={showShipTitle}
          onShipTitleDone={handleShipTitleDone}
        />
      );
  }
}

export default App;
