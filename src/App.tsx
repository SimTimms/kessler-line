import './App.css';
import { useAppLifecycle } from './hooks';
import { resumeAudioContext } from './sound/SoundManager';
import { useCallback, useState } from 'react';
import { tutorialStepRef } from './context/TutorialState';
import {
  shipVelocity,
  setHullIntegrity,
  setFuel,
  setO2,
  setShipCrew,
  shipDestroyed,
  mainEngineDisabled,
  resetAmmo,
} from './context/ShipState';
import { resetCameraMode } from './context/CameraMode';
import { SHIP_CREW_CAPACITY } from './config/dockTransferConfig';
import { shipPosRef } from './context/ShipPos';
import { clearNavTarget } from './context/NavTarget';
import { clearSelectedTarget } from './context/TargetSelection';
import { disableAutopilot } from './context/AutopilotState';
import StartOverlay from './components/App/StartOverlay';
import { GAME_MODES, type GameMode, type TutorialMenuSelection } from './config/gameModes';
import Sandbox from './components/Sandbox/Sandbox';
import ModelConfig from './components/ModelConfig/ModelConfig';
import LandingPadConfig from './components/LandingPadConfig/LandingPadConfig';
import InventoryConfig from './components/InventoryConfig/InventoryConfig';
import SalvageConfig from './components/SalvageConfig/SalvageConfig';
import DroneConfig from './components/DroneConfig/DroneConfig';
import LongDistanceTravelConfig from './components/LongDistanceTravelConfig/LongDistanceTravelConfig';
import CombatConfig from './components/CombatConfig/CombatConfig';
import HudConfig from './components/HudConfig/HudConfig';
import NarrativeConfig from './scenes/NarrativeConfig/NarrativeConfig';
import ShipNavigationConfig from './components/ShipNavigationConfig/ShipNavigationConfig';
import EmptyScene from './components/EmptyScene/EmptyScene';

function resetShipState(forTutorial = false) {
  shipVelocity.set(0, 0, 0);
  shipPosRef.current.set(0, 0, 0);
  setHullIntegrity(100);
  setFuel(100);
  setO2(100);
  setShipCrew(forTutorial ? SHIP_CREW_CAPACITY : 1);
  resetAmmo();
  resetCameraMode('free');
  shipDestroyed.current = false;
  mainEngineDisabled.reverseA.current = false;
  mainEngineDisabled.reverseB.current = false;
}

function App() {
  useAppLifecycle();
  const [mode, setMode] = useState<GameMode>(GAME_MODES.menu);
  const [narrativeLoadSave, setNarrativeLoadSave] = useState(false);

  const handleStart = useCallback(() => {
    resumeAudioContext();
  }, []);

  const handleTutorialSelect = useCallback((selection: TutorialMenuSelection) => {
    resumeAudioContext();
    resetShipState(true);
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialStepRef.current = 0;
    setNarrativeLoadSave(false);
    setMode(selection);
  }, []);

  const handleNarrativeLoad = useCallback(() => {
    resumeAudioContext();
    resetShipState(true);
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    setNarrativeLoadSave(true);
    setMode(GAME_MODES.narrativeConfig);
  }, []);

  switch (mode) {
    case GAME_MODES.menu:
      return (
        <StartOverlay
          onStart={handleStart}
          onTutorialSelect={handleTutorialSelect}
          onNarrativeLoad={handleNarrativeLoad}
        />
      );
    case GAME_MODES.narrativeConfig:
      return <NarrativeConfig loadSave={narrativeLoadSave} />;
    case GAME_MODES.modelConfig:
      return <ModelConfig />;
    case GAME_MODES.shipNavigationConfig:
      return <ShipNavigationConfig />;
    case GAME_MODES.shipConfig:
      return <LandingPadConfig />;
    case GAME_MODES.inventoryConfig:
      return <InventoryConfig />;
    case GAME_MODES.salvageConfig:
      return <SalvageConfig />;
    case GAME_MODES.droneConfig:
      return <DroneConfig />;
    case GAME_MODES.longDistanceTravelConfig:
      return <LongDistanceTravelConfig />;
    case GAME_MODES.combatConfig:
      return <CombatConfig />;
    case GAME_MODES.hudConfig:
      return <HudConfig />;
    case GAME_MODES.sandbox:
      return <Sandbox />;
  }
}

export default App;
