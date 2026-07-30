import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import {
  MAIN_ENGINE_HIT_RADIUS,
  damageHull,
  shipVelocity as playerShipVelocity,
  thrustBoostHeld,
  thrustBoostStoredMultiplier,
  thrustMultiplier,
} from '../../context/ShipState';
import { playImpactSoundOverlap, playRailgunHit } from '../../sound/SoundManager';
import { RAILGUN_DAMAGE_MIN, RAILGUN_DAMAGE_MAX } from '../../config/damageConfig';
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
  KEY_STABILISER,
  KEY_THRUST_BOOST,
  EVENT_REQUEST_UNDOCK,
} from '../../config/keybindings';
import { getActiveThrustMultiplierCap } from '../../context/FastTravelZones';
import {
  DOCKING_TUTORIAL_ALL_FLIGHT_KEYS,
  EVENT_DOCKING_TUTORIAL_INPUT_RESET,
  isDockingTutorialShipKeyAllowed,
  isDockingTutorialUndockAllowed,
} from '../../tutorial/tutorialDockingInputGate';
import {
  computeUndockReleaseDirection,
  detachShipFromDock,
  type ShipUndockedDetail,
} from './docking';
import { getCollidables } from '../../context/CollisionRegistry';
import { getDockCaptureProfile } from '../../utils/dockingCapture';
import { disablesShipPhysicsWhenDocked } from '../../config/dockCaptureConfig';
import { damageVesselHull, type VesselRuntimeState } from '../../context/VesselStateStore';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { SHIP_UNDOCK_DOCKING_COOLDOWN_MS, THRUST_BOOST_MULTIPLIER } from '../../config/shipConfig';

const _undockReleaseDir = new THREE.Vector3();

export interface InputListenersResult {
  thrustForward: React.MutableRefObject<boolean>;
  thrustReverse: React.MutableRefObject<boolean>;
  thrustLeft: React.MutableRefObject<boolean>;
  thrustRight: React.MutableRefObject<boolean>;
  thrustStrafeLeft: React.MutableRefObject<boolean>;
  thrustStrafeRight: React.MutableRefObject<boolean>;
  thrustRadialOut: React.MutableRefObject<boolean>;
  thrustRadialIn: React.MutableRefObject<boolean>;
  releaseParticleTrigger: React.MutableRefObject<boolean>;
  stabilizerActive: React.MutableRefObject<boolean>;
  resetInputs: () => void;
}

export function useInputListeners({
  vesselId,
  vesselState,
  dockedTo,
  velocity,
  groupRef,
  scene,
  physicsPosition,
  inputEnabledRef,
  listenersEnabled = true,
  undockHandlersRef,
  dockReentryBlock,
  dockingPortDisabledUntil,
}: {
  vesselId: string;
  vesselState: VesselRuntimeState;
  dockedTo: React.MutableRefObject<string | null>;
  velocity: React.MutableRefObject<THREE.Vector3>;
  groupRef: React.RefObject<THREE.Group>;
  scene: THREE.Object3D;
  physicsPosition: React.MutableRefObject<THREE.Vector3>;
  inputEnabledRef?: React.MutableRefObject<boolean>;
  listenersEnabled?: boolean;
  undockHandlersRef?: React.MutableRefObject<{
    tryBeginHoverUndock: (dockId: string) => boolean;
  }>;
  dockReentryBlock?: React.MutableRefObject<string | null>;
  dockingPortDisabledUntil?: React.MutableRefObject<number>;
}): InputListenersResult {
  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false); // A: yaw left
  const thrustRight = useRef(false); // D: yaw right
  const thrustStrafeLeft = useRef(false); // Q: strafe port
  const thrustStrafeRight = useRef(false); // E: strafe starboard
  const thrustRadialOut = useRef(false); // R: radial out (away from planet)
  const thrustRadialIn = useRef(false); // F: radial in (toward planet)
  const releaseParticleTrigger = useRef(false);
  const stabilizerActive = useRef(false);
  const lastRailgunTarget = useRef<'reverseA' | 'reverseB' | null>(null);
  const resetInputs = useCallback(() => {
    thrustForward.current = false;
    thrustReverse.current = false;
    thrustLeft.current = false;
    thrustRight.current = false;
    thrustStrafeLeft.current = false;
    thrustStrafeRight.current = false;
    thrustRadialOut.current = false;
    thrustRadialIn.current = false;
    stabilizerActive.current = false;
  }, []);

  useEffect(() => {
    if (!listenersEnabled) {
      resetInputs();
      return;
    }

    const performShipUndock = (): boolean => {
      if (!dockedTo.current) return false;
      if (undockHandlersRef?.current.tryBeginHoverUndock(dockedTo.current)) {
        return true;
      }
      const previousDockId = dockedTo.current;
      dockedTo.current = null;
      if (dockReentryBlock) dockReentryBlock.current = previousDockId;
      if (dockingPortDisabledUntil) {
        dockingPortDisabledUntil.current = performance.now() + SHIP_UNDOCK_DOCKING_COOLDOWN_MS;
      }

      let undockDetail: ShipUndockedDetail = { dockEntryId: previousDockId };
      if (groupRef.current) {
        detachShipFromDock(groupRef.current, scene);
        const dockEntry = getCollidables().find((c) => c.id === previousDockId);
        const profile = dockEntry ? getDockCaptureProfile(dockEntry) : null;
        // Always push away from the dock object in world space (not a fixed ship axis).
        const releaseDir = computeUndockReleaseDirection(
          groupRef.current,
          dockEntry,
          _undockReleaseDir
        );
        groupRef.current.position.addScaledVector(releaseDir, 1);
        const releaseSpeed = profile?.undockReleaseSpeed ?? 8;
        const releaseImpulse = releaseDir.clone().multiplyScalar(releaseSpeed);
        const towable = profile != null && !disablesShipPhysicsWhenDocked(profile);

        if (towable) {
          // Equal-and-opposite: ship gets V+I, partner gets V-I.
          undockDetail = {
            dockEntryId: previousDockId,
            partnerReleaseVelocity: {
              x: velocity.current.x - releaseImpulse.x,
              y: 0,
              z: velocity.current.z - releaseImpulse.z,
            },
          };
          velocity.current.add(releaseImpulse);
        } else {
          velocity.current.copy(releaseImpulse);
        }
        vesselState.shipVelocity.copy(velocity.current);
        if (vesselId === PLAYER_VESSEL_ID) {
          playerShipVelocity.copy(velocity.current);
        }
        groupRef.current.getWorldPosition(physicsPosition.current);
      }

      window.dispatchEvent(new CustomEvent('ShipUndocked', { detail: undockDetail }));
      releaseParticleTrigger.current = true;
      return true;
    };

    const beginThrustBoost = () => {
      if (vesselId !== PLAYER_VESSEL_ID || thrustBoostHeld.current) return;
      thrustBoostHeld.current = true;
      thrustBoostStoredMultiplier.current = thrustMultiplier.current;
      const zoneCap = getActiveThrustMultiplierCap();
      const boostTarget =
        zoneCap == null ? THRUST_BOOST_MULTIPLIER : Math.min(THRUST_BOOST_MULTIPLIER, zoneCap);
      thrustMultiplier.current = boostTarget;
    };

    const endThrustBoost = () => {
      if (vesselId !== PLAYER_VESSEL_ID || !thrustBoostHeld.current) return;
      thrustBoostHeld.current = false;
      const zoneCap = getActiveThrustMultiplierCap();
      const restored = thrustBoostStoredMultiplier.current;
      thrustMultiplier.current = zoneCap == null ? restored : Math.min(restored, zoneCap);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (inputEnabledRef && !inputEnabledRef.current) return;
      if (
        DOCKING_TUTORIAL_ALL_FLIGHT_KEYS.has(e.code) &&
        !isDockingTutorialShipKeyAllowed(e.code)
      ) {
        e.preventDefault();
        return;
      }
      if (e.code === KEY_THRUST_BOOST) {
        if (e.repeat) return;
        e.preventDefault();
        beginThrustBoost();
        return;
      }
      // Treat thrust keybindings in reverse so gameplay remains W=forward, S=reverse.
      if (e.code === KEY_THRUST_REVERSE) thrustReverse.current = true;
      if (e.code === KEY_THRUST_FORWARD) thrustForward.current = true;
      if (e.code === KEY_YAW_LEFT) thrustLeft.current = true;
      if (e.code === KEY_YAW_RIGHT) thrustRight.current = true;
      if (e.code === KEY_STRAFE_RIGHT) thrustStrafeRight.current = true;
      if (e.code === KEY_STRAFE_LEFT) thrustStrafeLeft.current = true;
      if (e.code === KEY_RADIAL_OUT) thrustRadialOut.current = true;
      if (e.code === KEY_RADIAL_IN) thrustRadialIn.current = true;
      if (e.code === KEY_UNDOCK_CARGO) {
        if (!performShipUndock()) {
          window.dispatchEvent(new CustomEvent('CargoRelease'));
        }
      }
      // Stabiliser: hold Space while flying (not docked) to fire opposing thrusters on all axes.
      if (e.code === KEY_STABILISER && !dockedTo.current) {
        stabilizerActive.current = true;
      }
    };

    const onRequestUndock = () => {
      if (!isDockingTutorialUndockAllowed()) return;
      performShipUndock();
    };

    const onDockingTutorialInputReset = () => {
      resetInputs();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (inputEnabledRef && !inputEnabledRef.current) return;
      if (e.code === KEY_THRUST_BOOST) {
        e.preventDefault();
        endThrustBoost();
        return;
      }
      if (e.code === KEY_THRUST_REVERSE) thrustReverse.current = false;
      if (e.code === KEY_THRUST_FORWARD) thrustForward.current = false;
      if (e.code === KEY_YAW_LEFT) thrustLeft.current = false;
      if (e.code === KEY_YAW_RIGHT) thrustRight.current = false;
      if (e.code === KEY_STRAFE_RIGHT) thrustStrafeRight.current = false;
      if (e.code === KEY_STRAFE_LEFT) thrustStrafeLeft.current = false;
      if (e.code === KEY_RADIAL_OUT) thrustRadialOut.current = false;
      if (e.code === KEY_RADIAL_IN) thrustRadialIn.current = false;
      if (e.code === KEY_STABILISER) stabilizerActive.current = false;
    };
    const onWindowBlur = () => endThrustBoost();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    window.addEventListener(EVENT_DOCKING_TUTORIAL_INPUT_RESET, onDockingTutorialInputReset);

    const onRailgunHit = (event: Event) => {
      const detail = (event as CustomEvent<{ targetEngine?: 'reverseA' | 'reverseB' | null }>)
        .detail;
      lastRailgunTarget.current = detail?.targetEngine ?? vesselState.railgunTargetEngine.current;
      playImpactSoundOverlap();
      playRailgunHit();
      const damage = RAILGUN_DAMAGE_MIN + Math.random() * (RAILGUN_DAMAGE_MAX - RAILGUN_DAMAGE_MIN);
      if (vesselId === PLAYER_VESSEL_ID) {
        damageHull(damage);
      } else {
        damageVesselHull(vesselId, damage);
      }
    };
    window.addEventListener('RailgunHit', onRailgunHit);

    const onDamagePoints = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          points: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number }>;
        }>
      ).detail;
      if (!detail?.points?.length || !groupRef.current) return;

      const group = groupRef.current;
      const localPoint = new THREE.Vector3();
      let closestA = Infinity;
      let closestB = Infinity;
      for (const point of detail.points) {
        localPoint.set(point.x, point.y, point.z);
        group.worldToLocal(localPoint);

        const distA = localPoint.distanceTo(vesselState.MAIN_ENGINE_LOCAL_POS.reverseA);
        const distB = localPoint.distanceTo(vesselState.MAIN_ENGINE_LOCAL_POS.reverseB);
        if (distA < closestA) closestA = distA;
        if (distB < closestB) closestB = distB;
      }

      const hitA = closestA <= MAIN_ENGINE_HIT_RADIUS;
      const hitB = closestB <= MAIN_ENGINE_HIT_RADIUS;
      const target = lastRailgunTarget.current ?? vesselState.railgunTargetEngine.current;

      if (target === 'reverseA' && hitA) {
        vesselState.mainEngineDisabled.reverseA.current = true;
      } else if (target === 'reverseB' && hitB) {
        vesselState.mainEngineDisabled.reverseB.current = true;
      }

      lastRailgunTarget.current = null;
      vesselState.railgunTargetEngine.current = null;
    };
    window.addEventListener('RailgunDamagePoints', onDamagePoints);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
      window.removeEventListener(EVENT_DOCKING_TUTORIAL_INPUT_RESET, onDockingTutorialInputReset);
      window.removeEventListener('RailgunHit', onRailgunHit);
      window.removeEventListener('RailgunDamagePoints', onDamagePoints);
      endThrustBoost();
    };
    // dockedTo and velocity are stable refs — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupRef, inputEnabledRef, listenersEnabled, resetInputs, vesselId, vesselState]);

  return {
    thrustForward,
    thrustReverse,
    thrustLeft,
    thrustRight,
    thrustStrafeLeft,
    thrustStrafeRight,
    thrustRadialOut,
    thrustRadialIn,
    releaseParticleTrigger,
    stabilizerActive,
    resetInputs,
  };
}
