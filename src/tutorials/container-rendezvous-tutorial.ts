import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipControlDisabledUntil, getShipSpeedMps, shipVelocity } from '../context/ShipState';
import {
  shipInstructionMessage,
  chatterState,
  scrapperIntroActive,
  scrapperWorldPos,
  scrapperWorldQuat,
} from '../context/CinematicState';
import { selectedTargetVelocity, selectedTargetPosition } from '../context/TargetSelection';
import { shipPosRef } from '../context/ShipPos';
import {
  KEY_THRUST_REVERSE,
  KEY_THRUST_FORWARD,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_UNDOCK_CARGO,
} from '../config/keybindings';
import {
  SCRAPPER_BRAKE_EVENT_DELAY,
  SCRAPPER_CAPTAIN_CUE_DELAY,
  SCRAPPER_CONTROLS_ENABLE_DELAY,
  SCRAPPER_INTRO_DIALOGUE_URLS,
  SCRAPPER_DIALOGUE_START_OFFSET,
  SCRAPPER_PLAYER_OFFSET_X,
  SCRAPPER_PLAYER_OFFSET_Y,
  SCRAPPER_PLAYER_OFFSET_Z,
  SCRAPPER_CONTAINER_ID,
  SCRAPPER_DRIVE_SIG_ID,
} from '../config/scrapperConfig';

/** Derive a human-readable key label from a KeyboardEvent.code string. */
function codeToLabel(code: string): string {
  return code.startsWith('Key') ? code.slice(3) : code.toUpperCase();
}

export type ContainerRondeViewHintPhase =
  | 'idle'
  | 'thrust'
  | 'hold'
  | 'scanner'
  | 'approach'
  | 'docking'
  | 'drifting'
  | 'final_approach'
  | 'captured'
  | 'deactivate_scanner'
  | 'activate_drive'
  | 'nav_to_parent'
  | 'targeting_parent'
  | 'returning'
  | 'return_approach'
  | 'done';

export const targetMPS = 20;
/** Hint 1 — shown the moment the player gains control. */
export const CONTAINER_RENDEZVOUZ_THRUST_HINT = `HOLD ${codeToLabel(KEY_THRUST_REVERSE)} FOR FORWARD THRUST`;

/** Hint 2 — shown after the player first presses the thrust key. */
export const CONTAINER_RENDEZVOUZ_HOLD_HINT = `INCREASE VELOCITY TO ${targetMPS.toFixed(1)} M/S`;

/** Hint 3 — shown once speed reaches the velocity threshold. */
export const CONTAINER_RENDEZVOUZ_SCANNER_HINT = 'ENABLE MAGNET SCANNER — SET TO MAX POWER';

/** Hint 4 — shown once the magnet scanner is at max power. */
export const CONTAINER_RENDEZVOUZ_APPROACH_HINT = `RELEASE ${codeToLabel(KEY_THRUST_REVERSE)} — SELECT CARGO POD AS NAV TARGET`;

/** How long (ms) hint 3 stays on screen as a safety fallback. */
export const CONTAINER_RENDEZVOUZ_APPROACH_HINT_DURATION = 15000;

/** Speed (m/s) that triggers the transition from hint 2 -> hint 3. */
export const CONTAINER_RENDEZVOUZ_VELOCITY_THRESHOLD = 20;

/** Closing speed (m/s) that transitions hint 4 -> hint 5. */
export const CONTAINER_RENDEZVOUZ_DOCKING_REL_SPEED_THRESHOLD = 10;

/** Hint 4 — shown after the player clicks the cargo pod. */
export const CONTAINER_RENDEZVOUZ_DOCKING_HINT = `THRUST ${codeToLabel(KEY_THRUST_FORWARD)} TOWARD CARGO POD — BUILD APPROACH SPEED TO ${CONTAINER_RENDEZVOUZ_DOCKING_REL_SPEED_THRESHOLD} M/S`;

/** Distance (world units / metres) that triggers the final prompt. */
export const CONTAINER_RENDEZVOUZ_FINAL_APPROACH_DISTANCE = 150;

/** Hint 5 — shown once the player is approaching the pod. */
export const CONTAINER_RENDEZVOUZ_DRIFT_HINT = `DRIFT CLOSER UNTIL THE CARGO POD IS ${CONTAINER_RENDEZVOUZ_FINAL_APPROACH_DISTANCE}M AWAY`;

/** Hint 6 — shown once the player is within final approach distance of the cargo pod. */
export const CONTAINER_RENDEZVOUZ_FINAL_APPROACH_HINT = `SLOW TO 7 M/S - PRESS ${codeToLabel(
  KEY_THRUST_FORWARD
)} TO REDUCE VELOCITY - MAKE CONTACT WITH CARGO POD TO ENGAGE MAG CLAMPS`;

/** Hint 7 — shown once the cargo pod is magnetically clamped to the ship. */
export const CONTAINER_RENDEZVOUZ_CAPTURED_HINT = `CARGO POD SECURED — MAG CLAMPS ENGAGED`;

/** Hint 7b — shown after cargo capture, prompting to power down magnet scanner. */
export const CONTAINER_RENDEZVOUZ_DEACTIVATE_SCANNER_HINT =
  'POWER DOWN MAGNET SCANNER — CONSERVE ELECTRICAL CHARGE';

/** Hint 7c — shown after magnet off, prompting to enable drive scanner at max. */
export const CONTAINER_RENDEZVOUZ_ACTIVATE_DRIVE_HINT =
  'ENABLE DRIVE SCANNER — POWER TO MAXIMUM TO DETECT PARENT VESSEL';

/** Hint 7d — shown after drive at 5, prompting to select parent as nav target. */
export const CONTAINER_RENDEZVOUZ_NAV_TO_PARENT_HINT = 'SELECT PARENT VESSEL AS NAV TARGET';

/** Hint 8 — shown after capture, prompting the player to target the parent vessel. */
export const CONTAINER_RENDEZVOUZ_TARGET_PARENT_HINT = 'CLICK ON THE PARENT SHIP TO TARGET IT';

/** Hint 9b — shown 5 s into the return journey, pointing out the trajectory line. */
export const CONTAINER_RENDEZVOUZ_TRAJECTORY_HINT =
  'YOUR TRAJECTORY LINE SHOWS WHERE YOU ARE HEADING — USE THRUST TO AIM IT AT YOUR TARGET';

/** Hint 9 — shown once the player starts moving toward the parent vessel. */
export const CONTAINER_RENDEZVOUZ_RETURNING_HINT =
  `AIM AT PARENT VESSEL — ${codeToLabel(KEY_THRUST_REVERSE)} TO THRUST — ` +
  `USE ${codeToLabel(KEY_STRAFE_LEFT)}/${codeToLabel(KEY_STRAFE_RIGHT)} TO ALIGN TRAJECTORY INDICATOR WITH VESSEL`;

/** Hint 10 — shown when within close approach range of the parent vessel. */
export const CONTAINER_RENDEZVOUZ_RETURN_APPROACH_HINT =
  `ALIGN TRAJECTORY WITH CARGO BAY — USE ${codeToLabel(KEY_STRAFE_LEFT)}/${codeToLabel(KEY_STRAFE_RIGHT)} — ` +
  `PRESS ${codeToLabel(KEY_UNDOCK_CARGO)} TO RELEASE CARGO POD`;

/** Hint 11 — shown once the pod is captured inside the bay. */
export const CONTAINER_RENDEZVOUZ_RETURN_COMPLETE_HINT =
  'CARGO POD DELIVERED — RENDEZVOUS TUTORIAL COMPLETE';

/** Hint 12 — shown 5 s after tutorial complete, prompting the player to dock. */
export const CONTAINER_RENDEZVOUZ_DOCK_RETURN_HINT = 'ROTATE 180 DEGREES — ENTER THE DOCKING BAY';

/** Delay before evaluating drift-speed transition after target lock. */
export const CONTAINER_RENDEZVOUZ_DOCKING_GRACE_MS = 3000;

/** Distance to bay centre (units) that triggers the release hint. */
export const CONTAINER_RENDEZVOUZ_RETURN_APPROACH_DISTANCE = 600;

/** Distance to bay (units) at which Neptune railguns attack the parent vessel. */
export const CONTAINER_RENDEZVOUZ_SCRAPPER_ATTACK_DISTANCE = 1500;

/** Sphere radius around bay centre (units) that counts as pod delivered. */
export const CONTAINER_RENDEZVOUZ_BAY_CAPTURE_RADIUS = 100;

const _relVel = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _bayWorldPos = new THREE.Vector3();

interface UseContainerRendezvousTutorialParams {
  enabled: boolean;
}

/**
 * Runs the container rendezvous tutorial timeline:
 * intro release event, control handoff, hint progression, and docking approach guidance.
 */
export function useContainerRendezvousTutorial({ enabled }: UseContainerRendezvousTutorialParams) {
  const hintPhase = useRef<ContainerRondeViewHintPhase>('idle');
  const dockingHintShownAt = useRef(0);
  const scrapperAttackedRef = useRef(false);
  const dialogueAudio = useRef<HTMLAudioElement | null>(null);
  const introEndedByTimer = useRef(false);

  const playDialogueSequence = (urls: string[], index = 0) => {
    if (index >= urls.length) return;
    const audio = new Audio(urls[index]);
    dialogueAudio.current = audio;
    audio.onended = () => playDialogueSequence(urls, index + 1);
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!enabled) return;
    introEndedByTimer.current = false;

    // ── Scrapper intro: lock controls until captain's cue ─────────────────────
    scrapperIntroActive.current = true;
    shipControlDisabledUntil.current = Infinity;

    const brakingChatterLines = [
      "Captain, we're losing the cargo pod—",
      'Braking thrusters are nominal. How far did it drift?',
      "It's heading for atmosphere. Someone needs to go get it.",
      'Pilot — your ship is in Bay 2. You know what to do.',
    ];

    let brakingTimers: ReturnType<typeof setTimeout>[] = [];
    let thrustListener: ((e: KeyboardEvent) => void) | null = null;

    const onBrakingStarted = () => {
      // Crewmate chatter
      chatterState.lines = brakingChatterLines;
      chatterState.index = 0;

      const releaseTimer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ScrapperCargoRelease'));
      }, SCRAPPER_BRAKE_EVENT_DELAY);

      const captainTimer = window.setTimeout(() => {
        shipInstructionMessage.current = 'CAPTAIN: LAUNCH AND RETRIEVE THE CARGO';
      }, SCRAPPER_CAPTAIN_CUE_DELAY);

      const enableTimer = window.setTimeout(() => {
        introEndedByTimer.current = true;
        scrapperIntroActive.current = false;
        window.dispatchEvent(new CustomEvent('ScrapperIntroEnded'));
        shipControlDisabledUntil.current = 0;

        // ── Hint 1: prompt the player to press thrust ────────────────────────
        hintPhase.current = 'thrust';
        shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_THRUST_HINT;

        thrustListener = (e: KeyboardEvent) => {
          if (e.code !== KEY_THRUST_REVERSE) return;
          if (thrustListener) {
            window.removeEventListener('keydown', thrustListener);
            thrustListener = null;
          }
          // ── Hint 2: encourage holding to build velocity ────────────────────
          hintPhase.current = 'hold';
          shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_HOLD_HINT;
        };

        if (thrustListener) {
          window.addEventListener('keydown', thrustListener);
        }
      }, SCRAPPER_CONTROLS_ENABLE_DELAY);

      const dialogueTimer = window.setTimeout(() => {
        playDialogueSequence(SCRAPPER_INTRO_DIALOGUE_URLS);
      }, SCRAPPER_BRAKE_EVENT_DELAY + SCRAPPER_DIALOGUE_START_OFFSET);

      brakingTimers = [releaseTimer, captainTimer, enableTimer, dialogueTimer];
    };

    const advanceToDocking = () => {
      if (hintPhase.current !== 'approach') return;
      hintPhase.current = 'docking';
      dockingHintShownAt.current = Date.now();
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_DOCKING_HINT;
      window.dispatchEvent(new CustomEvent('NavTargetHighlightStop'));
    };

    const onMagnetMaxed = () => {
      if (hintPhase.current !== 'scanner') return;
      hintPhase.current = 'approach';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_APPROACH_HINT;
      window.dispatchEvent(new CustomEvent('MagnetHighlightStop'));
      window.dispatchEvent(new CustomEvent('NavTargetHighlightStart'));
      window.setTimeout(() => {
        if (hintPhase.current === 'approach') {
          shipInstructionMessage.current = '';
          hintPhase.current = 'done';
          window.dispatchEvent(new CustomEvent('NavTargetHighlightStop'));
        }
      }, CONTAINER_RENDEZVOUZ_APPROACH_HINT_DURATION);
    };

    const onCargoPodTargeted = () => {
      advanceToDocking();
    };

    const onNavScanContactSelected = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (id === SCRAPPER_CONTAINER_ID) advanceToDocking();
      if (id === SCRAPPER_DRIVE_SIG_ID && hintPhase.current === 'nav_to_parent') {
        startReturningPhase();
      }
    };

    let targetingTimer: ReturnType<typeof setTimeout> | null = null;
    let trajectoryTimer: ReturnType<typeof setTimeout> | null = null;

    const startReturningPhase = () => {
      hintPhase.current = 'returning';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_RETURNING_HINT;
      window.dispatchEvent(new CustomEvent('NavTargetHighlightStop'));
      window.dispatchEvent(new CustomEvent('NavContactHighlightStop'));
      if (trajectoryTimer !== null) window.clearTimeout(trajectoryTimer);
      trajectoryTimer = window.setTimeout(() => {
        if (hintPhase.current === 'returning' || hintPhase.current === 'return_approach') {
          shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_TRAJECTORY_HINT;
          window.dispatchEvent(new CustomEvent('TrajectoryHighlightStart'));
        }
      }, 5000);
    };

    const onCargoContained = () => {
      hintPhase.current = 'captured';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_CAPTURED_HINT;
      targetingTimer = window.setTimeout(() => {
        if (hintPhase.current === 'captured') {
          hintPhase.current = 'deactivate_scanner';
          shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_DEACTIVATE_SCANNER_HINT;
          window.dispatchEvent(new CustomEvent('MagnetHighlightStart'));
        }
      }, 4000);
    };

    const onMagnetScannerOff = () => {
      if (hintPhase.current !== 'deactivate_scanner') return;
      hintPhase.current = 'activate_drive';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_ACTIVATE_DRIVE_HINT;
      window.dispatchEvent(new CustomEvent('MagnetHighlightStop'));
      window.dispatchEvent(new CustomEvent('DriveHighlightStart'));
    };

    const onDriveAt5 = () => {
      if (hintPhase.current !== 'activate_drive') return;
      hintPhase.current = 'nav_to_parent';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_NAV_TO_PARENT_HINT;
      window.dispatchEvent(new CustomEvent('DriveHighlightStop'));
      window.dispatchEvent(new CustomEvent('NavTargetHighlightStart'));
      window.dispatchEvent(
        new CustomEvent('NavContactHighlightStart', { detail: { id: SCRAPPER_DRIVE_SIG_ID } })
      );
    };

    const onScrapperTargeted = () => {
      if (
        hintPhase.current === 'targeting_parent' ||
        hintPhase.current === 'nav_to_parent' ||
        hintPhase.current === 'captured'
      ) {
        startReturningPhase();
      }
    };

    const onCargoBayCapture = () => {
      hintPhase.current = 'done';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_RETURN_COMPLETE_HINT;
      window.dispatchEvent(new CustomEvent('TrajectoryHighlightStop'));
      if (!scrapperAttackedRef.current) {
        scrapperAttackedRef.current = true;
        window.dispatchEvent(new CustomEvent('ScrapperUnderAttack'));
      }
      window.setTimeout(() => {
        if (hintPhase.current === 'done') {
          shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_DOCK_RETURN_HINT;
        }
      }, 5000);
    };

    window.addEventListener('ScrapperBrakingStarted', onBrakingStarted);
    window.addEventListener('MagnetScannerMaxed', onMagnetMaxed);
    window.addEventListener('MagnetScannerOff', onMagnetScannerOff);
    window.addEventListener('DriveSignatureAt5', onDriveAt5);
    window.addEventListener('CargoPodTargeted', onCargoPodTargeted);
    window.addEventListener('NavScanContactSelected', onNavScanContactSelected);
    window.addEventListener('CargoContained', onCargoContained);
    window.addEventListener('ScrapperTargeted', onScrapperTargeted);
    window.addEventListener('CargoBayCapture', onCargoBayCapture);

    return () => {
      brakingTimers.forEach((t) => window.clearTimeout(t));
      if (targetingTimer !== null) window.clearTimeout(targetingTimer);
      if (trajectoryTimer !== null) window.clearTimeout(trajectoryTimer);
      window.dispatchEvent(new CustomEvent('MagnetHighlightStop'));
      window.dispatchEvent(new CustomEvent('DriveHighlightStop'));
      window.dispatchEvent(new CustomEvent('NavTargetHighlightStop'));
      window.dispatchEvent(new CustomEvent('NavContactHighlightStop'));
      window.dispatchEvent(new CustomEvent('TrajectoryHighlightStop'));
      window.removeEventListener('ScrapperBrakingStarted', onBrakingStarted);
      window.removeEventListener('MagnetScannerMaxed', onMagnetMaxed);
      window.removeEventListener('MagnetScannerOff', onMagnetScannerOff);
      window.removeEventListener('DriveSignatureAt5', onDriveAt5);
      window.removeEventListener('CargoPodTargeted', onCargoPodTargeted);
      window.removeEventListener('NavScanContactSelected', onNavScanContactSelected);
      window.removeEventListener('CargoContained', onCargoContained);
      window.removeEventListener('ScrapperTargeted', onScrapperTargeted);
      window.removeEventListener('CargoBayCapture', onCargoBayCapture);
      if (thrustListener) {
        window.removeEventListener('keydown', thrustListener);
      }
      if (dialogueAudio.current) {
        dialogueAudio.current.pause();
        dialogueAudio.current.onended = null;
        dialogueAudio.current = null;
      }
      // Do not synthesize ScrapperIntroEnded from cleanup; in React Strict Mode
      // cleanup runs during development remount checks and would incorrectly
      // jump the camera straight to launch mode.
      if (!introEndedByTimer.current) {
        scrapperIntroActive.current = true;
      }
      shipControlDisabledUntil.current = 0;
      hintPhase.current = 'done';
    };
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;

    // ── Hint 2 -> 3: advance to scanner hint when speed threshold reached ───
    if (
      hintPhase.current === 'hold' &&
      getShipSpeedMps() >= CONTAINER_RENDEZVOUZ_VELOCITY_THRESHOLD
    ) {
      hintPhase.current = 'scanner';
      shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_SCANNER_HINT;
      window.dispatchEvent(new CustomEvent('MagnetHighlightStart'));
    }

    // ── Hints 9-10: return journey — distance-based transitions ─────────────
    if (hintPhase.current === 'returning' || hintPhase.current === 'return_approach') {
      _bayWorldPos
        .set(SCRAPPER_PLAYER_OFFSET_X, SCRAPPER_PLAYER_OFFSET_Y, SCRAPPER_PLAYER_OFFSET_Z)
        .applyQuaternion(scrapperWorldQuat)
        .add(scrapperWorldPos);
      const distToBay = shipPosRef.current.distanceTo(_bayWorldPos);

      if (
        hintPhase.current === 'returning' &&
        distToBay < CONTAINER_RENDEZVOUZ_RETURN_APPROACH_DISTANCE
      ) {
        hintPhase.current = 'return_approach';
        shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_RETURN_APPROACH_HINT;
        window.dispatchEvent(new CustomEvent('TrajectoryHighlightStop'));
      }
    }

    // ── Hints 4-6: approach sequence ─────────────────────────────────────────
    if (
      hintPhase.current === 'docking' ||
      hintPhase.current === 'drifting' ||
      hintPhase.current === 'final_approach'
    ) {
      _toTarget.copy(selectedTargetPosition).sub(shipPosRef.current);
      const distToTarget = _toTarget.length();

      if (distToTarget > 0.01) {
        _toTarget.divideScalar(distToTarget);
        // positive = approaching (ship closing on pod), negative = receding
        const signedRelSpeed = _relVel
          .copy(shipVelocity)
          .sub(selectedTargetVelocity)
          .dot(_toTarget);

        // Hint 4 -> 5: player is approaching at >= threshold speed (after grace)
        if (
          hintPhase.current === 'docking' &&
          Date.now() - dockingHintShownAt.current > CONTAINER_RENDEZVOUZ_DOCKING_GRACE_MS &&
          signedRelSpeed >= CONTAINER_RENDEZVOUZ_DOCKING_REL_SPEED_THRESHOLD
        ) {
          hintPhase.current = 'drifting';
          shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_DRIFT_HINT;
        }

        // Hint 5/4 -> 6: within 100m of the pod
        if (
          (hintPhase.current === 'docking' || hintPhase.current === 'drifting') &&
          distToTarget < CONTAINER_RENDEZVOUZ_FINAL_APPROACH_DISTANCE
        ) {
          hintPhase.current = 'final_approach';
          shipInstructionMessage.current = CONTAINER_RENDEZVOUZ_FINAL_APPROACH_HINT;
        }
      }
    }
  });
}
