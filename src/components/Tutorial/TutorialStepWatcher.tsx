import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { shipVelocity, shipAngularVelocity } from '../../context/ShipState';
import { tutorialStepRef } from '../../context/TutorialState';
import { TUTORIAL_STEPS } from '../../tutorial/tutorialSteps';
import { KEY_THRUST_REVERSE, KEY_STRAFE_LEFT, KEY_STRAFE_RIGHT } from '../../config/keybindings';

interface Props {
  onStepAdvance: () => void;
}

// Runs inside the R3F Canvas. Checks step completion conditions each frame
// and fires onStepAdvance when the current step's condition is met.
export default function TutorialStepWatcher({ onStepAdvance }: Props) {
  const lastStep = useRef(-1);
  const advancedRef = useRef(false);
  const hadSpeedRef = useRef(false);
  const brakeKeyRef = useRef(false);
  const strafeKeyRef = useRef(false);

  // Key listeners — only set flags when on the relevant step so early presses
  // don't accidentally satisfy a future step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const id = TUTORIAL_STEPS[tutorialStepRef.current]?.id;
      if (id === 'brake' && e.code === KEY_THRUST_REVERSE) brakeKeyRef.current = true;
      if (id === 'strafe' && (e.code === KEY_STRAFE_LEFT || e.code === KEY_STRAFE_RIGHT)) {
        strafeKeyRef.current = true;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame(() => {
    const step = tutorialStepRef.current;
    if (step >= TUTORIAL_STEPS.length) return;

    // Reset per-step tracking when entering a new step
    if (lastStep.current !== step) {
      lastStep.current = step;
      advancedRef.current = false;
      hadSpeedRef.current = false;
      brakeKeyRef.current = false;
      strafeKeyRef.current = false;
    }

    if (advancedRef.current) return;

    const speed = shipVelocity.length();
    const id = TUTORIAL_STEPS[step].id;
    let met = false;

    if (id === 'thrust') {
      met = speed > 3;
    } else if (id === 'yaw') {
      met = Math.abs(shipAngularVelocity.current) > 0.02;
    } else if (id === 'brake') {
      if (speed > 5) hadSpeedRef.current = true;
      met = hadSpeedRef.current && brakeKeyRef.current;
    } else if (id === 'strafe') {
      met = strafeKeyRef.current;
    }

    if (met) {
      advancedRef.current = true;
      onStepAdvance();
    }
  });

  return null;
}
