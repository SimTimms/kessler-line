import { useCallback, useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import LunarTutorialScene from './LunarTutorialScene';
import TutorialOverlay from './TutorialOverlay';
import RadioChatterStream from '../Radio/RadioChatterStream';
import { tutorialStepRef, tutorialThrustersHighlightedRef } from '../../context/TutorialState';
import {
  getThrustersHighlightedForStep,
  getPowerHudElementsHighlightedForStep,
  getHudElementsHighlightedForStep,
  getDisabledPowerElementsForStep,
  getDisabledHudElementsForStep,
} from '../../tutorial/tutorialHighlights';
import { TUTORIAL_STEPS } from '../../tutorial/tutorialSteps';
import type { TutorialStep } from '../../tutorial/tutorialSteps';
import type { TutorialMenuSelection } from '../../config/gameModes';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import { tutorialNavViewModeRef } from './TutorialFollowCamera';
import { NavHUD } from '../Huds/NavHUD/NavHUD';
import { HUD } from '../Huds/HUD/HUD';
import PowerHUD from '../Huds/PowerHUD/PowerHUD';
import { spotlightOnRef } from '../Combat/LaserRay';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { POWER_HUD_ELEMENTS } from '../Huds/PowerHUD/PowerHUD';
import { HUDElements } from '../Huds/HUD/HUD';

interface Props {
  onComplete: () => void;
  tutorialMode: TutorialMenuSelection;
}

export default function TutorialResources({ onComplete, tutorialMode }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);

  const [activePowerElements, setActivePowerElements] = useState<string[]>([]);
  const [activeHudElements, setActiveHudElements] = useState<string[]>([]);

  const [disabledPowerElements, setDisabledPowerElements] = useState<string[]>(
    Object.values(POWER_HUD_ELEMENTS)
  );
  const [disabledHudElements, setDisabledHudElements] = useState<string[]>([
    HUDElements.DRIVE,
    HUDElements.PROXIMITY,
    HUDElements.RADIO,
    HUDElements.RADIATION,
    HUDElements.SPOTLIGHT,
  ]);

  useEffect(() => {
    tutorialStepRef.current = 0;
    setCurrentStep(0);
    tutorialNavViewModeRef.current = false;
  }, [tutorialMode]);

  const handleStepAdvance = useCallback(() => {
    tutorialStepRef.current += 1;
    setCurrentStep((s) => s + 1);
  }, []);

  const steps: TutorialStep[] = TUTORIAL_STEPS;

  const currentStepId = steps[currentStep]?.id;

  useEffect(() => {
    tutorialThrustersHighlightedRef.current = getThrustersHighlightedForStep(currentStepId);
    setActivePowerElements(getPowerHudElementsHighlightedForStep(currentStepId));
    setActiveHudElements(getHudElementsHighlightedForStep(currentStepId));
    setDisabledPowerElements(getDisabledPowerElementsForStep(currentStepId));
    setDisabledHudElements(getDisabledHudElementsForStep(currentStepId));
  }, [currentStepId]);

  return (
    <AppContainer>
      <NavHudKeyBinding />
      <LunarTutorialScene onStepAdvance={handleStepAdvance} />
      <TutorialOverlay
        steps={steps}
        currentStep={currentStep}
        onComplete={onComplete}
        onSkip={onComplete}
        onContinueStep={handleStepAdvance}
      />
      <NavHUD disableElements={[]} focusElements={[]} />
      <PowerHUD disableElements={disabledPowerElements} focusElements={activePowerElements} />
      <HUD
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        spotlightOnRef={spotlightOnRef}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        magneticOnRef={magneticOnRef}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        driveSignatureOnRef={driveSignatureOnRef}
        proximity={proximity}
        setProximity={setProximity}
        proximityScanOnRef={proximityScanOnRef}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        radioOnRef={radioOnRef}
        focusElements={activeHudElements}
        disableElements={disabledHudElements}
      />
      <RadioChatterStream />
    </AppContainer>
  );
}
