import { dockingTutorialActiveRef, tutorialStepRef } from '../context/TutorialState';
import { TUTORIAL_DOCKING_STEPS } from './tutorialDockingSteps';
import {
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_RADIAL_OUT,
  KEY_RADIAL_IN,
  KEY_UNDOCK_CARGO,
  KEY_THRUST_INCREASE,
  KEY_THRUST_DECREASE,
  KEY_THRUST_INCREASE_NP,
  KEY_THRUST_DECREASE_NP,
} from '../config/keybindings';

/** Fired when the docking tutorial step index changes — clears held ship inputs. */
export const EVENT_DOCKING_TUTORIAL_INPUT_RESET = 'DockingTutorialInputReset';

/** Keys handled by `useInputListeners` (ship + thrust level + undock/cargo). */
export const DOCKING_TUTORIAL_ALL_FLIGHT_KEYS = new Set<string>([
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_RADIAL_OUT,
  KEY_RADIAL_IN,
  KEY_UNDOCK_CARGO,
  KEY_THRUST_INCREASE,
  KEY_THRUST_DECREASE,
  KEY_THRUST_INCREASE_NP,
  KEY_THRUST_DECREASE_NP,
]);

/** Thrust / steer / thrust-level only — Space excluded so free-flight cards do not trigger cargo release. */
export const DOCKING_TUTORIAL_FREE_FLIGHT_KEYS = new Set(DOCKING_TUTORIAL_ALL_FLIGHT_KEYS);
DOCKING_TUTORIAL_FREE_FLIGHT_KEYS.delete(KEY_UNDOCK_CARGO);

type StepShipAllowlist = Set<string> | 'all';

function buildShipAllowlists(): StepShipAllowlist[] {
  const n = TUTORIAL_DOCKING_STEPS.length;
  const lists: StepShipAllowlist[] = Array.from({ length: n }, () => new Set<string>());

  // Indices follow `tutorialDockingSteps.ts` order (duplicate `id` values differ by index only).
  lists[1] = new Set([KEY_UNDOCK_CARGO]); // docking-undock
  lists[10] = new Set([KEY_THRUST_REVERSE]); // docking-relative-velocity-state
  lists[15] = new Set([KEY_STRAFE_LEFT, KEY_STRAFE_RIGHT]); // strafe hint (last trajectory-correction card)
  lists[16] = new Set([KEY_THRUST_REVERSE]); // docking-relative-velocity-curve
  lists[17] = 'all'; // docking-relative-distance — free flight + camera toggle handled separately
  lists[18] = new Set([KEY_THRUST_FORWARD]); // docking-relative-slow
  lists[19] = 'all'; // docking-waypoint-final-approach
  lists[21] = 'all'; // docking-return-daedalus
  lists[22] = 'all'; // docking-redock

  return lists;
}

const SHIP_ALLOW_BY_STEP = buildShipAllowlists();

function buildCumulativeShipAllowedByStep(perStep: StepShipAllowlist[]): Set<string>[] {
  const acc = new Set<string>();
  return perStep.map((allowed) => {
    if (allowed === 'all') {
      for (const code of DOCKING_TUTORIAL_FREE_FLIGHT_KEYS) acc.add(code);
    } else {
      for (const code of allowed) acc.add(code);
    }
    return new Set(acc);
  });
}

/** Union of ship keys allowed on this step or any earlier docking-tutorial step. */
const CUMULATIVE_SHIP_ALLOWED_BY_STEP = buildCumulativeShipAllowedByStep(SHIP_ALLOW_BY_STEP);

export function isDockingTutorialShipKeyAllowed(code: string): boolean {
  if (!dockingTutorialActiveRef.current) return true;
  const i = tutorialStepRef.current;
  if (i < 0 || i >= CUMULATIVE_SHIP_ALLOWED_BY_STEP.length) return true;
  return CUMULATIVE_SHIP_ALLOWED_BY_STEP[i].has(code);
}

export function isDockingTutorialUndockAllowed(): boolean {
  if (!dockingTutorialActiveRef.current) return true;
  // Step 1 introduces undock; keep it available for the rest of the drill.
  return tutorialStepRef.current >= 1;
}
