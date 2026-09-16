import './App.css';
import { useAppLifecycle } from './hooks';
import { resumeAudioContext } from './sound/SoundManager';
import { useCallback, useState } from 'react';
import StartOverlay from './components/App/StartOverlay/StartOverlay';
import { GAME_MODES, type GameMode, type TutorialMenuSelection } from './config/gameModes';
import ModelConfig from './scenes/ModelConfig/ModelConfig';
import LandingPadConfig from './scenes/LandingPadConfig/LandingPadConfig';
import InventoryConfig from './scenes/InventoryConfig/InventoryConfig';
import SalvageConfig from './scenes/SalvageConfig/SalvageConfig';
import DroneConfig from './scenes/DroneConfig/DroneConfig';
import CombatConfig from './scenes/CombatConfig/CombatConfig';
import HudConfig from './scenes/HudConfig/HudConfig';
import NarrativeConfig from './scenes/NarrativeConfig/NarrativeConfig';
import ShipNavigationConfig from './scenes/ShipNavigationConfig/ShipNavigationConfig';
import { handleTutorialSelect } from './helpers/handleTutorialSelect';
import { handleNarrativeLoad } from './helpers/handleNarrativeLoad';

function App() {
  useAppLifecycle();
  const [mode, setMode] = useState<GameMode>(GAME_MODES.menu);
  const [narrativeLoadSave, setNarrativeLoadSave] = useState(false);

  const handleStart = useCallback(() => {
    resumeAudioContext();
  }, []);

  const handleTutorialSelectCB = useCallback((selection: TutorialMenuSelection) => {
    handleTutorialSelect({ selection, setNarrativeLoadSave, setMode });
  }, []);

  const handleNarrativeLoadCB = useCallback(() => {
    handleNarrativeLoad({ setNarrativeLoadSave, setMode, selection: GAME_MODES.narrativeConfig });
  }, []);

  switch (mode) {
    case GAME_MODES.menu:
      return (
        <StartOverlay
          onStart={handleStart}
          onTutorialSelect={handleTutorialSelectCB}
          onNarrativeLoad={handleNarrativeLoadCB}
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
    case GAME_MODES.combatConfig:
      return <CombatConfig />;
    case GAME_MODES.hudConfig:
      return <HudConfig />;
  }
}

export default App;
