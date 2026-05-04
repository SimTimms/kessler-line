import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import AppContainer from '../App/AppContainer';
import AppStyles from '../App/AppStyles';
import TutorialScene from './TutorialScene';
import TutorialDockingScene from './TutorialDockingScene';
import TutorialOverlay from './TutorialOverlay';
import RadioChatterStream from '../Radio/RadioChatterStream';
import { dockingTutorialActiveRef, tutorialStepRef } from '../../context/TutorialState';
import { applyRadioChatterPool, setRadioChatterPhase } from '../../radio/radioChatterPhase';
import { TUTORIAL_RADIO_CHATTER_LINES } from '../../tutorial/tutorialRadioChatter';
import { TUTORIAL_STEPS } from '../../tutorial/tutorialSteps';
import {
  DOCKING_RELATIVE_VELOCITY_CHECK_TARGET_MPS,
  TUTORIAL_DOCKING_STEPS,
} from '../../tutorial/tutorialDockingSteps';
import { KEY_THRUST_REVERSE, displayLabelForKeyCode } from '../../config/keybindings';
import type { TutorialStep } from '../../tutorial/tutorialSteps';
import type { TutorialMenuSelection } from '../App/StartOverlay';
import NavHudKeyBinding from '../App/NavHudKeyBinding';
import TutorialNavHudToggle from './TutorialNavHudToggle';
import { tutorialNavViewModeRef } from './TutorialFollowCamera';
import { setNavHudEnabled } from '../../context/NavHud';
import { NavHUD } from '../NavHUD/NavHUD';
import { HUD } from '../HUD/HUD';
import MagneticHUD from '../MagneticHUD';
import PowerHUD from '../PowerHUD/PowerHUD';
import { spotlightOnRef } from '../Combat/LaserRay';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { shipPosRef } from '../../context/ShipPos';
import { shipVelocity } from '../../context/ShipState';
import { navTargetIdRef, navTargetPosRef } from '../../context/NavTarget';
import {
  clearSelectedTarget,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetVelocity,
} from '../../context/TargetSelection';
import { FUEL_STATION_DEF } from '../../config/worldConfig';
import { getCollidables } from '../../context/CollisionRegistry';
import { TUTORIAL_MOON_POSITION } from '../../config/moonConfig';

interface Props {
  onComplete: () => void;
  tutorialMode: TutorialMenuSelection;
}

export default function TutorialShell({ onComplete, tutorialMode }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [navTargetClicked, setNavTargetClicked] = useState(false);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
  const [relativeVelocityPrompt, setRelativeVelocityPrompt] = useState(
    "You're currently moving away from the waypoint drone. You need to increase your velocity past zero to start closing the distance."
  );
  const [relVelCheckThrustPressed, setRelVelCheckThrustPressed] = useState(false);

  useEffect(() => {
    applyRadioChatterPool(TUTORIAL_RADIO_CHATTER_LINES);
    setNavHudEnabled(false);
    clearSelectedTarget();
    navTargetIdRef.current = '';
    return () => {
      dockingTutorialActiveRef.current = false;
      setRadioChatterPhase('pre');
      setNavHudEnabled(true);
      navTargetIdRef.current = FUEL_STATION_DEF.id;
      navTargetPosRef.current.set(...FUEL_STATION_DEF.position);
    };
  }, []);

  useEffect(() => {
    dockingTutorialActiveRef.current = tutorialMode === 'docking';
    return () => {
      dockingTutorialActiveRef.current = false;
    };
  }, [tutorialMode]);

  useEffect(() => {
    tutorialStepRef.current = 0;
    setCurrentStep(0);
    setNavTargetClicked(false);
    tutorialNavViewModeRef.current = false;
  }, [tutorialMode]);

  const handleStepAdvance = useCallback(() => {
    tutorialStepRef.current += 1;
    setCurrentStep((s) => s + 1);
  }, []);
  const handleStepSet = useCallback((step: number) => {
    tutorialStepRef.current = step;
    setCurrentStep(step);
  }, []);

  const steps: TutorialStep[] =
    tutorialMode === 'general-movement'
      ? TUTORIAL_STEPS
      : TUTORIAL_DOCKING_STEPS.map((step) =>
          step.id === 'docking-relative-velocity-state'
            ? { ...step, prompt: relativeVelocityPrompt }
            : step
        );
  const dockingMagneticStepIndex = TUTORIAL_DOCKING_STEPS.findIndex(
    (s) => s.id === 'docking-magnetic-scan'
  );
  const dockingScannerTargetStepIndex = TUTORIAL_DOCKING_STEPS.findIndex(
    (s) => s.id === 'docking-scanner'
  );
  const dockingTargetLockedStepIndex = TUTORIAL_DOCKING_STEPS.findIndex(
    (s) => s.id === 'docking-target-locked'
  );
  const dockingReturnDaedalusStepIndex = TUTORIAL_DOCKING_STEPS.findIndex(
    (s) => s.id === 'docking-return-daedalus'
  );
  const dockingRelativeVelocityIntroStepIndex = TUTORIAL_DOCKING_STEPS.findIndex(
    (s) => s.id === 'docking-relative-velocity-intro'
  );
  const showDockingNavHudBar = tutorialMode === 'docking';
  const showDockingNavTargetControl =
    tutorialMode === 'docking' &&
    currentStep >=
      (dockingScannerTargetStepIndex >= 0
        ? dockingScannerTargetStepIndex
        : Number.POSITIVE_INFINITY);
  // Once magnetic scan is introduced, keep scanner HUD + power rail mounted for the whole drill
  // so waypoint brackets and nav context stay visible after target lock.
  const showDockingScannerHud =
    tutorialMode === 'docking' &&
    currentStep >=
      (dockingMagneticStepIndex >= 0 ? dockingMagneticStepIndex : Number.POSITIVE_INFINITY);
  const isDockingMagneticStepActive =
    tutorialMode === 'docking' &&
    TUTORIAL_DOCKING_STEPS[currentStep]?.id === 'docking-magnetic-scan';
  const isDockingRelativeStateStepActive =
    tutorialMode === 'docking' &&
    TUTORIAL_DOCKING_STEPS[currentStep]?.id === 'docking-relative-velocity-state';
  const isDockingScannerStepActive =
    tutorialMode === 'docking' && TUTORIAL_DOCKING_STEPS[currentStep]?.id === 'docking-scanner';
  const isDockingRelativeVelocityPhase =
    tutorialMode === 'docking' &&
    currentStep >=
      (dockingRelativeVelocityIntroStepIndex >= 0
        ? dockingRelativeVelocityIntroStepIndex
        : Number.POSITIVE_INFINITY);
  const showDockingAutopilot =
    tutorialMode === 'docking' && TUTORIAL_DOCKING_STEPS[currentStep]?.id === 'docking-redock';
  const tutorialGeneralTargets = useMemo(
    () => [
      {
        id: 'tutorial-daedalus',
        label: 'Daedalus',
        getPosition: (target: THREE.Vector3) => {
          const bay = getCollidables().find((c) => c.id === 'docking-bay-tutorial-space-station');
          if (bay) return bay.getWorldPosition(target);
          return target.set(0, 0, 0);
        },
      },
    ],
    []
  );
  const tutorialPlanetaryTargets = useMemo(
    () => [
      {
        id: 'tutorial-luna',
        label: 'Luna',
        getPosition: (target: THREE.Vector3) =>
          target.set(
            TUTORIAL_MOON_POSITION[0],
            TUTORIAL_MOON_POSITION[1],
            TUTORIAL_MOON_POSITION[2]
          ),
      },
    ],
    []
  );

  useEffect(() => {
    if (!isDockingRelativeStateStepActive) {
      setRelVelCheckThrustPressed(false);
      return;
    }
    const onThrustKey = (e: KeyboardEvent) => {
      if (e.code === KEY_THRUST_REVERSE) setRelVelCheckThrustPressed(true);
    };
    window.addEventListener('keydown', onThrustKey);
    return () => window.removeEventListener('keydown', onThrustKey);
  }, [isDockingRelativeStateStepActive]);

  useEffect(() => {
    if (!isDockingRelativeStateStepActive) return;

    const thrustKey = displayLabelForKeyCode(KEY_THRUST_REVERSE);
    const targetMpsLabel =
      DOCKING_RELATIVE_VELOCITY_CHECK_TARGET_MPS <= 0
        ? 'more than 0 m/s'
        : `at least ${DOCKING_RELATIVE_VELOCITY_CHECK_TARGET_MPS} m/s`;

    if (relVelCheckThrustPressed) {
      setRelativeVelocityPrompt(
        `Hold down ${thrustKey} until you reach ${targetMpsLabel} relative closing speed toward the waypoint drone.`
      );
      return;
    }

    const hasSelected = selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
    const targetPos = hasSelected ? selectedTargetPosition : null;
    if (!targetPos) return;

    const toTarget = targetPos.clone().sub(shipPosRef.current);
    const dist = toTarget.length();
    if (dist < 1e-5) {
      setRelativeVelocityPrompt(
        "You're currently stationary relative to the waypoint drone. Increase your velocity past zero to start closing the distance."
      );
      return;
    }

    toTarget.multiplyScalar(1 / dist);
    const relVel = shipVelocity.clone().sub(selectedTargetVelocity).dot(toTarget);
    if (relVel > DOCKING_RELATIVE_VELOCITY_CHECK_TARGET_MPS) {
      setRelativeVelocityPrompt(
        'You are moving towards the drone, maintain a positive velocity. Wait for further instructions.'
      );
    } else if (relVel < 0) {
      setRelativeVelocityPrompt(
        "You're currently moving away from the waypoint drone. You need to increase your velocity past zero to start closing the distance."
      );
    } else {
      setRelativeVelocityPrompt(
        "You're currently stationary relative to the waypoint drone. Increase your velocity past zero to start closing the distance."
      );
    }
  }, [isDockingRelativeStateStepActive, relVelCheckThrustPressed]);

  useEffect(() => {
    if (tutorialMode !== 'docking') return;
    // Keep nav guides off until we explicitly reveal targeting after magnetic scan.
    setNavHudEnabled(showDockingNavTargetControl);
  }, [tutorialMode, showDockingNavTargetControl]);

  useEffect(() => {
    if (tutorialMode !== 'docking') return;
    if (TUTORIAL_DOCKING_STEPS[currentStep]?.id === 'docking-return-daedalus') {
      setNavTargetClicked(false);
    }
  }, [tutorialMode, currentStep]);
  const completionConfig =
    tutorialMode === 'general-movement'
      ? {
          completionKicker: 'General Movement Complete',
          completionTitle: 'Flight Basics Locked In',
          completionCopy:
            'You completed core handling and momentum control.\nYou can start Docking from the tutorial list when ready.',
          completeButtonLabel: 'Begin Mission',
        }
      : {
          completionKicker: 'Docking Drill Complete',
          completionTitle: 'Pilot Certified',
          completionCopy:
            'You completed the full onboarding loop.\nYou are cleared for live operations.',
          completeButtonLabel: 'Begin Mission',
        };
  return (
    <AppContainer>
      <NavHudKeyBinding />
      {tutorialMode === 'general-movement' ? (
        <TutorialScene onStepAdvance={handleStepAdvance} />
      ) : (
        <TutorialDockingScene onStepAdvance={handleStepAdvance} onStepSet={handleStepSet} />
      )}
      <TutorialOverlay
        steps={steps}
        currentStep={currentStep}
        onComplete={onComplete}
        onSkip={onComplete}
        onContinueStep={handleStepAdvance}
        completionKicker={completionConfig.completionKicker}
        completionTitle={completionConfig.completionTitle}
        completionCopy={completionConfig.completionCopy}
        completeButtonLabel={completionConfig.completeButtonLabel}
      />
      {tutorialMode === 'docking' && (
        <TutorialNavHudToggle
          flashing={TUTORIAL_DOCKING_STEPS[currentStep]?.id === 'docking-navhud-toggle'}
        />
      )}
      {showDockingNavHudBar && (
        <NavHUD
          showNavTarget={showDockingNavTargetControl}
          showAutopilot={showDockingAutopilot}
          showMetrics={false}
          forceNavTargetFlash={showDockingNavTargetControl && !navTargetClicked}
          onNavTargetClick={() => setNavTargetClicked(true)}
          customGeneralTargets={tutorialMode === 'docking' ? tutorialGeneralTargets : undefined}
          customPlanetaryTargets={tutorialMode === 'docking' ? tutorialPlanetaryTargets : undefined}
          showDriveContacts={tutorialMode !== 'docking'}
          forcedHighlightContactId={
            isDockingScannerStepActive ||
            (tutorialMode === 'docking' &&
              currentStep ===
                (dockingTargetLockedStepIndex >= 0
                  ? dockingTargetLockedStepIndex
                  : Number.NEGATIVE_INFINITY))
              ? 'tutorial-waypoint-drone'
              : tutorialMode === 'docking' &&
                  currentStep ===
                    (dockingReturnDaedalusStepIndex >= 0
                      ? dockingReturnDaedalusStepIndex
                      : Number.NEGATIVE_INFINITY)
                ? 'tutorial-daedalus'
                : undefined
          }
        />
      )}
      {showDockingScannerHud && (
        <>
          <MagneticHUD />
          <div className="hud-scanner-wrap">
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
              tutorialMagneticFocus={isDockingMagneticStepActive}
            />
          </div>
        </>
      )}
      {isDockingRelativeVelocityPhase && (
        <div className="tutorial-powerhud-focus">
          <PowerHUD />
        </div>
      )}
      <RadioChatterStream />
      <AppStyles />
    </AppContainer>
  );
}
