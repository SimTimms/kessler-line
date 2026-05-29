import { useCallback, useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import TutorialAirScene from './TutorialRadioScene';
import TutorialOverlay from '../TutorialShared/TutorialOverlay';
import { highlightedHudElements, disabledHudElements } from './tutorialRadioHighlights';
import { TUTORIAL_STEPS } from './tutorialRadioSteps';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import { spotlightOnRef } from '../../context/SpotlightState';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { DeathOverlay } from '../Ship/DeathOverlay';
import { resetTutorialAirRun } from './resetTutorialRadioRun';
import MagneticHUD from '../Huds/MagneticHUD';
import DriveSignatureHUD from '../Huds/DriveSignatureHUD';
import ProximityHUD from '../Proximity/ProximityHUD';
import RadiationHUD from '../RadiationHUD';
import HelmetHUD from '../Huds/HelmetHUD/HelmetHUD';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';

interface Props {
  onComplete: () => void;
}

export default function TutorialAir({ onComplete }: Props) {
  const [deathOverlayKey, setDeathOverlayKey] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
  const [activeHudElementsState, setActiveHudElementsState] = useState<string[]>([]);
  const [disabledHudElementsState, setDisabledHudElementsState] = useState<string[]>([]);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
  }, []);

  useEffect(() => {
    setActiveHudElementsState(highlightedHudElements(TUTORIAL_STEPS[currentStep].id));
    setDisabledHudElementsState(disabledHudElements(TUTORIAL_STEPS[currentStep].id));
  }, [currentStep]);

  const restartTutorial = useCallback(() => {
    resetTutorialAirRun();
    setCurrentStep(0);
    setSpotlightOn(false);
    setMagneticOn(false);
    setDriveSignatureOn(false);
    setProximity(false);
    setRadioOn(false);
    spotlightOnRef.current = false;
    magneticOnRef.current = false;
    driveSignatureOnRef.current = false;
    proximityScanOnRef.current = false;
    radioOnRef.current = false;
    setDeathOverlayKey((k) => k + 1);
  }, []);

  return (
    <AppContainer>
      <NavHudKeyBinding />
      <TutorialAirScene onStepAdvance={() => setCurrentStep((s) => s + 1)} />
      <TutorialOverlay
        steps={TUTORIAL_STEPS}
        currentStep={currentStep}
        onComplete={onComplete}
        onSkip={onComplete}
        onContinueStep={() => setCurrentStep((s) => s + 1)}
      />
      <HelmetHUD
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
        sceneRadioContactsOnly
      />
      <MagneticHUD />
      <DriveSignatureHUD />
      <ProximityHUD />
      <RadiationHUD />
      <DeathOverlay
        key={deathOverlayKey}
        restartLabel="Restart Tutorial"
        onRestart={restartTutorial}
      />
    </AppContainer>
  );
}
