import { useCallback, useState } from 'react';
import { resumeAudioContext } from '../sound/SoundManager';
import { resetShipState } from '../context/resetShipState';
import { clearNavTarget } from '../context/NavTarget';
import { clearSelectedTarget } from '../context/TargetSelection';
import { disableAutopilot } from '../context/AutopilotState';
import { tutorialStepRef } from '../context/TutorialState';
import { GAME_MODES, type GameMode, type TutorialMenuSelection } from '../config/gameModes';

export function useGameModeHandlers() {
  const [mode, setMode] = useState<GameMode>(GAME_MODES.menu);
  const [showShipTitle, setShowShipTitle] = useState(false);
  const [narrativeLoadSave, setNarrativeLoadSave] = useState(false);

  const handleStart = useCallback(() => {
    resumeAudioContext();
    setMode(GAME_MODES.menu);
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

  const handleShipTitleDone = useCallback(() => {
    setShowShipTitle(false);
  }, []);

  return {
    mode,
    showShipTitle,
    narrativeLoadSave,
    handleStart,
    handleTutorialSelect,
    handleNarrativeLoad,
    handleShipTitleDone,
  };
}
