import { useCallback, useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import TutorialAirScene from './TutorialAirScene';
import TutorialOverlay from '../TutorialShared/TutorialOverlay';
import { highlightedHudElements, disabledHudElements } from './tutorialAirHighlights';
import { TUTORIAL_STEPS } from './tutorialAirSteps';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import { ScannerHUD } from '../Huds/HUD/ScannerHUD';
import PowerHUD from '../Huds/PowerHUD/PowerHUD';
import { spotlightOnRef } from '../../context/SpotlightState';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { DeathOverlay } from '../Ship/DeathOverlay';
import { resetTutorialAirRun } from './resetTutorialAirRun';
import MagneticHUD from '../Huds/MagneticHUD';
import DriveSignatureHUD from '../Huds/DriveSignatureHUD';
import ProximityHUD from '../Proximity/ProximityHUD';
import RadiationHUD from '../RadiationHUD';

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
