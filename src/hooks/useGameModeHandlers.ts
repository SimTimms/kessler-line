import { useCallback, useState } from 'react';
import { resumeAudioContext } from '../sound/SoundManager';
import { resetShipState } from '../context/resetShipState';
import { clearNavTarget } from '../context/NavTarget';
import { clearSelectedTarget } from '../context/TargetSelection';
import { disableAutopilot } from '../context/AutopilotState';
import { tutorialStepRef } from '../context/TutorialState';
import { applyTutorialOrbitalSpawn } from '../config/tutorialOrbitalConfig';
import { GAME_MODES, type GameMode, type TutorialMenuSelection } from '../config/gameModes';

export function useGameModeHandlers() {
  const [mode, setMode] = useState<GameMode>(GAME_MODES.menu);
  const [tutorialMode, setTutorialMode] = useState<TutorialMenuSelection>(GAME_MODES.tutorial);
  const [showShipTitle, setShowShipTitle] = useState(false);
  const [narrativeLoadSave, setNarrativeLoadSave] = useState(false);

  const handleStart = useCallback(() => {
    resumeAudioContext();
    setMode(GAME_MODES.game);
    setShowShipTitle(true);
  }, []);

  const handleTutorialSelect = useCallback((selection: TutorialMenuSelection) => {
    resumeAudioContext();
    resetShipState(true);
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialStepRef.current = 0;
    setNarrativeLoadSave(false);
    if (selection === GAME_MODES.orbitalManagement) {
      applyTutorialOrbitalSpawn();
    }
    setTutorialMode(selection);
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

  const handleTutorialComplete = useCallback(() => {
    resetShipState(false);
    tutorialStepRef.current = 0;
    setMode(GAME_MODES.game);
    setShowShipTitle(true);
  }, []);

  const handleShipTitleDone = useCallback(() => {
    setShowShipTitle(false);
  }, []);

  return {
    mode,
    tutorialMode,
    showShipTitle,
    narrativeLoadSave,
    handleStart,
    handleTutorialSelect,
    handleNarrativeLoad,
    handleTutorialComplete,
    handleShipTitleDone,
  };
}
