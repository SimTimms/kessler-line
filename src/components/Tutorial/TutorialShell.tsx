import { useCallback, useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import AppStyles from '../App/AppStyles';
import ControlLayer from '../App/ControlLayer';
import TutorialScene from './TutorialScene';
import TutorialOverlay from './TutorialOverlay';
import RadioChatterStream from '../Radio/RadioChatterStream';
import { tutorialStepRef } from '../../context/TutorialState';
import { applyRadioChatterPool, setRadioChatterPhase } from '../../radio/radioChatterPhase';
import { TUTORIAL_RADIO_CHATTER_LINES } from '../../tutorial/tutorialRadioChatter';

interface Props {
  onComplete: () => void;
}

export default function TutorialShell({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [thrustLevel, setThrustLevel] = useState(1);

  useEffect(() => {
    applyRadioChatterPool(TUTORIAL_RADIO_CHATTER_LINES);
    return () => {
      setRadioChatterPhase('pre');
    };
  }, []);

  const handleStepAdvance = useCallback(() => {
    tutorialStepRef.current += 1;
    setCurrentStep((s) => s + 1);
  }, []);

  return (
    <AppContainer>
      <TutorialScene onStepAdvance={handleStepAdvance} />
      <TutorialOverlay currentStep={currentStep} onComplete={onComplete} />
      <RadioChatterStream />
      <ControlLayer thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
      <AppStyles />
    </AppContainer>
  );
}
