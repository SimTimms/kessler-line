import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { shipVelocity, shipAngularVelocity } from '../../context/ShipState';
import { tutorialStepRef } from '../../context/TutorialState';
import { TUTORIAL_STEPS } from '../../tutorial/tutorialSteps';
import type { CompletionCriteria } from '../../tutorial/tutorialSteps';

interface Props {
  onStepAdvance: () => void;
}

// Mutable state bag reset on every step change.
interface StepState {
  keydownMet: boolean;
  eventMet: boolean;
  mouseOrbitMet: boolean;
  mouseScrollMet: boolean;
  speedOnce: boolean;
  // For 'all' criteria: index-aligned boolean array, one entry per sub-criterion.
  allSubMet: boolean[];
}

function freshState(): StepState {
  return {
    keydownMet: false,
    eventMet: false,
    mouseOrbitMet: false,
    mouseScrollMet: false,
    speedOnce: false,
    allSubMet: [],
  };
}

// Evaluates the criteria that cannot be determined from DOM events alone (speed, angular, all).
// Event-driven criteria (keydown, event, mouse*) are updated by listeners and read from state.
function evalCriteria(
  c: CompletionCriteria,
  state: StepState,
  speed: number,
  angularVelocity: number
): boolean {
  switch (c.type) {
    case 'continue':
      return false;
    case 'keydown':
      return state.keydownMet;
    case 'event':
      return state.eventMet;
    case 'mouseOrbit':
      return state.mouseOrbitMet;
    case 'mouseScroll':
      return state.mouseScrollMet;
    case 'speed':
      if (speed >= c.min) state.speedOnce = true;
      return state.speedOnce;
    case 'angular':
      if (Math.abs(angularVelocity) >= c.min) state.speedOnce = true; // reuse speedOnce as "latch"
      return state.speedOnce;
    case 'all':
      return c.criteria.every((sub, i) => {
        if (state.allSubMet[i]) return true;
        // Physics-driven sub-criteria are checked here; event-driven ones are set by handlers.
        let met = false;
        if (sub.type === 'speed') met = speed >= sub.min;
        else if (sub.type === 'angular') met = Math.abs(angularVelocity) >= sub.min;
        if (met) state.allSubMet[i] = true;
        return state.allSubMet[i] ?? false;
      });
  }
}

// Runs inside the R3F Canvas. Checks step completion conditions each frame
// and fires onStepAdvance when the current step's criteria is met.
export default function TutorialStepWatcher({ onStepAdvance }: Props) {
  const lastStepRef = useRef(-1);
  const advancedRef = useRef(false);
  const stateRef = useRef<StepState>(freshState());
  const mouseDownRef = useRef(false);
  const mouseDeltaRef = useRef(0);

  useEffect(() => {
    // ── Keyboard ──────────────────────────────────────────────────────────────
    const onKey = (e: KeyboardEvent) => {
      const step = TUTORIAL_STEPS[tutorialStepRef.current];
      const c = step?.completionCriteria;
      if (!c) return;
      if (c.type === 'keydown' && c.codes.includes(e.code)) {
        stateRef.current.keydownMet = true;
      } else if (c.type === 'all') {
        c.criteria.forEach((sub, i) => {
          if (sub.type === 'keydown' && sub.codes.includes(e.code)) {
            stateRef.current.allSubMet[i] = true;
          }
        });
      }
    };

    // ── Custom window events (e.g. ShipUndocked) ──────────────────────────────
    // Collect all unique event names declared across steps.
    const eventNames = new Set<string>();
    for (const step of TUTORIAL_STEPS) {
      if (step.completionCriteria?.type === 'event') {
        eventNames.add(step.completionCriteria.name);
      }
    }
    const eventHandlers = [...eventNames].map((name) => {
      const handler = () => {
        const step = TUTORIAL_STEPS[tutorialStepRef.current];
        const c = step?.completionCriteria;
        if (c?.type === 'event' && c.name === name) {
          stateRef.current.eventMet = true;
        }
      };
      window.addEventListener(name, handler);
      return { name, handler };
    });

    // ── Mouse orbit (hold + drag) ──────────────────────────────────────────────
    const ORBIT_DRAG_THRESHOLD = 30; // cumulative px
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDownRef.current = true;
        mouseDeltaRef.current = 0;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;
      mouseDeltaRef.current += Math.hypot(e.movementX, e.movementY);
      if (mouseDeltaRef.current >= ORBIT_DRAG_THRESHOLD) {
        const step = TUTORIAL_STEPS[tutorialStepRef.current];
        if (step?.completionCriteria?.type === 'mouseOrbit') {
          stateRef.current.mouseOrbitMet = true;
        }
      }
    };
    const onMouseUp = () => {
      mouseDownRef.current = false;
    };

    // ── Scroll ────────────────────────────────────────────────────────────────
    const onWheel = () => {
      const step = TUTORIAL_STEPS[tutorialStepRef.current];
      if (step?.completionCriteria?.type === 'mouseScroll') {
        stateRef.current.mouseScrollMet = true;
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      eventHandlers.forEach(({ name, handler }) => window.removeEventListener(name, handler));
    };
  }, []);

  useFrame(() => {
    const step = tutorialStepRef.current;
    if (step >= TUTORIAL_STEPS.length) return;

    // Reset per-step tracking when entering a new step.
    if (lastStepRef.current !== step) {
      lastStepRef.current = step;
      advancedRef.current = false;
      stateRef.current = freshState();
      mouseDownRef.current = false;
      mouseDeltaRef.current = 0;
    }

    if (advancedRef.current) return;

    const criteria = TUTORIAL_STEPS[step].completionCriteria;
    if (!criteria) return; // no criteria defined — step must be advanced externally

    const speed = shipVelocity.length();
    const angular = shipAngularVelocity.current;
    const met = evalCriteria(criteria, stateRef.current, speed, angular);

    if (met) {
      advancedRef.current = true;
      onStepAdvance();
    }
  });

  return null;
}
