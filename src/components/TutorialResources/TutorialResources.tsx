import { useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import TutorialResourcesScene from './TutorialResourcesScene';
import TutorialOverlay from '../TutorialShared/TutorialOverlay';
import { highlightedHudElements, disabledHudElements } from './tutorialResourcesHighlights';
import { TUTORIAL_STEPS } from './tutorialResourcesSteps';
import type { TutorialMenuSelection } from '../../config/gameModes';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import { ScannerHUD } from '../Huds/HUD/ScannerHUD';
import PowerHUD from '../Huds/PowerHUD/PowerHUD';
import { spotlightOnRef } from '../Combat/LaserRay';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { ScannerHUDElements } from '../Huds/HUD/ScannerHUD';

const defaultDisabledHudElements = [];

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
  const [activeHudElementsState, setActiveHudElementsState] = useState<string[]>([]);
  const [disabledHudElementsState, setDisabledHudElementsState] = useState<string[]>([]);

  useEffect(() => {
    setActiveHudElementsState(highlightedHudElements(TUTORIAL_STEPS[currentStep].id));
    setDisabledHudElementsState(disabledHudElements(TUTORIAL_STEPS[currentStep].id));
  }, [currentStep]);

  return (
    <AppContainer>
      <NavHudKeyBinding />
      <TutorialResourcesScene onStepAdvance={() => setCurrentStep((s) => s + 1)} />
      <TutorialOverlay
        steps={TUTORIAL_STEPS}
        currentStep={currentStep}
        onComplete={onComplete}
        onSkip={onComplete}
        onContinueStep={() => setCurrentStep((s) => s + 1)}
      />
      <PowerHUD disableElements={disabledHudElementsState} focusElements={activeHudElementsState} />
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
        focusElements={activeHudElementsState}
        disableElements={disabledHudElementsState}
      />
    </AppContainer>
  );
}
