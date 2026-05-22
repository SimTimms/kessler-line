import { useCallback, useEffect, useState } from 'react';
import { radiationOnRef, radiationRangeRef, radiationExposureRef } from '../../context/RadiationScan';
import {
  activeRadiationZonesRef,
  activeRadiationHullDrainRateRef,
} from '../../context/ActiveRadiationZones';
import {
  RADIATION_ZONES as MAIN_RADIATION_ZONES,
  RADIATION_HULL_DRAIN_RATE as MAIN_RADIATION_HULL_DRAIN_RATE,
} from '../../config/radiationConfig';
import {
  RADIATION_ZONES as TUTORIAL_RADIATION_ZONES,
  RADIATION_HULL_DRAIN_RATE as TUTORIAL_RADIATION_HULL_DRAIN_RATE,
} from './radationConfigTutorial';
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
import { DeathOverlay } from '../Ship/DeathOverlay';
import { resetTutorialResourcesRun } from './resetTutorialResourcesRun';

const defaultDisabledHudElements = [];

interface Props {
  onComplete: () => void;
  tutorialMode: TutorialMenuSelection;
}

export default function TutorialResources({ onComplete, tutorialMode }: Props) {
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
    radiationOnRef.current = false;
    radiationRangeRef.current = 0;
    radiationExposureRef.current = 0;
    activeRadiationZonesRef.current = TUTORIAL_RADIATION_ZONES;
    activeRadiationHullDrainRateRef.current = TUTORIAL_RADIATION_HULL_DRAIN_RATE;
    return () => {
      radiationOnRef.current = false;
      radiationRangeRef.current = 0;
      radiationExposureRef.current = 0;
      activeRadiationZonesRef.current = MAIN_RADIATION_ZONES;
      activeRadiationHullDrainRateRef.current = MAIN_RADIATION_HULL_DRAIN_RATE;
    };
  }, []);

  useEffect(() => {
    setActiveHudElementsState(highlightedHudElements(TUTORIAL_STEPS[currentStep].id));
    setDisabledHudElementsState(disabledHudElements(TUTORIAL_STEPS[currentStep].id));
  }, [currentStep]);

  const restartTutorial = useCallback(() => {
    resetTutorialResourcesRun();
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
      <DeathOverlay
        key={deathOverlayKey}
        restartLabel="Restart Tutorial"
        onRestart={restartTutorial}
      />
    </AppContainer>
  );
}
