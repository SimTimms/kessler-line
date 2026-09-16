import { tutorialStepRef } from '../context/TutorialState';
import { resumeAudioContext } from '../sound/SoundManager';
import { resetShipState } from '../helpers/resetShipState';
import { clearNavTarget } from '../context/NavTarget';
import { clearSelectedTarget } from '../context/TargetSelection';
import { disableAutopilot } from '../context/AutopilotState';
import { type GameMode, type TutorialMenuSelection } from '../config/gameModes';

export function handleTutorialSelect({
  selection,
  setNarrativeLoadSave,
  setMode,
}: {
  selection: TutorialMenuSelection;
  setNarrativeLoadSave: React.Dispatch<React.SetStateAction<boolean>>;
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
}) {
  resumeAudioContext();
  resetShipState(true);
  clearNavTarget();
  clearSelectedTarget();
  disableAutopilot();
  tutorialStepRef.current = 0;
  setNarrativeLoadSave(false);
  setMode(selection);
}
