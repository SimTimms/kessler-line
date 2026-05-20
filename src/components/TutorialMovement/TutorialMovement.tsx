import { useCallback, useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import LunarTutorialScene from './TutorialMovementScene';
import TutorialOverlay from '../TutorialShared/TutorialOverlay';
import RadioChatterStream from '../Radio/RadioChatterStream';
import { tutorialStepRef, tutorialThrustersHighlightedRef } from '../../context/TutorialState';
import {
  getThrustersHighlightedForStep,
  highlightedHudElements,
  getScannerHudElementsHighlightedForStep,
  disabledHudElements,
  getDisabledScannerHudElementsForStep,
} from './tutorialMovementHighlights';
import { TUTORIAL_STEPS } from './tutorialMovementSteps';
import type { TutorialMovementStep } from './tutorialMovementSteps';
import type { TutorialMenuSelection } from '../../config/gameModes';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import { tutorialNavViewModeRef } from '../TutorialShared/TutorialFollowCamera';
import { ScannerHUD } from '../Huds/HUD/ScannerHUD';
import PowerHUD from '../Huds/PowerHUD/PowerHUD';
import { spotlightOnRef } from '../Combat/LaserRay';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import {
  MOVEMENT_HUD_ELEMENTS,
  INVENTORY_HUD_ELEMENTS,
  HULL_HUD_ELEMENTS,
  RESOURCE_HUD_ELEMENTS,
} from '../Huds/PowerHUD/PowerHUD';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';

interface Props {
  onComplete: () => void;
  tutorialMode: TutorialMenuSelection;
}

export default function TutorialMovement({ onComplete, tutorialMode }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);

  const [activePowerElements, setActivePowerElements] = useState<string[]>([]);
  const [activeHudElements, setActiveHudElements] = useState<string[]>([]);

  const [disabledPowerElements, setDisabledPowerElements] = useState<string[]>([
    ...Object.values(MOVEMENT_HUD_ELEMENTS),
    ...Object.values(INVENTORY_HUD_ELEMENTS),
    ...Object.values(HULL_HUD_ELEMENTS),
    ...Object.values(RESOURCE_HUD_ELEMENTS),
  ]);
  const [disabledHudElements, setDisabledHudElements] = useState<string[]>([
    ScannerHUDElements.DRIVE,
    ScannerHUDElements.PROXIMITY,
    ScannerHUDElements.RADIO,
    ScannerHUDElements.RADIATION,
    ScannerHUDElements.SPOTLIGHT,
    ScannerHUDElements.MAGNET,
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

  const steps: TutorialMovementStep[] = TUTORIAL_STEPS;

  const currentStepId = steps[currentStep]?.id;

  useEffect(() => {
    tutorialThrustersHighlightedRef.current = getThrustersHighlightedForStep(currentStepId);
    setActivePowerElements(highlightedHudElements(currentStepId));
    setActiveHudElements(getScannerHudElementsHighlightedForStep(currentStepId));
    setDisabledPowerElements(disabledHudElements(currentStepId));
    setDisabledHudElements(getDisabledScannerHudElementsForStep(currentStepId));
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
      <PowerHUD disableElements={disabledPowerElements} focusElements={activePowerElements} />
      <ScannerHUD
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
