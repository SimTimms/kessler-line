import { resetShipState } from '../helpers/resetShipState';
import { clearNavTarget } from '../context/NavTarget';
import { clearSelectedTarget } from '../context/TargetSelection';
import { disableAutopilot } from '../context/AutopilotState';
import { resumeAudioContext } from '../sound/SoundManager';
import { tutorialStepRef } from '../context/TutorialState';
import { type GameMode, type TutorialMenuSelection } from '../config/gameModes';

interface HandleNarrativeLoadProps {
    setNarrativeLoadSave: React.Dispatch<React.SetStateAction<boolean>>;
    setMode: React.Dispatch<React.SetStateAction<GameMode>>;
    selection: TutorialMenuSelection;
}

export function handleNarrativeLoad({ setNarrativeLoadSave, setMode, selection }: HandleNarrativeLoadProps) {
    resumeAudioContext();
    resetShipState(true);
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    tutorialStepRef.current = 0;
    setNarrativeLoadSave(false);
    setMode(selection);
}