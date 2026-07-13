import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  THRUST,
  cinematicThrustForward,
  cinematicThrustReverse,
  shipVelocity,
  shipAcceleration,
  shipAngularVelocity,
  shipQuaternion,
  shipDestroyed,
  shipControlDisabledUntil,
  thrustMultiplier,
  mainEngineDisabled,
  canUsePropulsion,
  effectiveThrustFwd,
  effectiveThrustRev,
  effectiveYawLeft,
  effectiveYawRight,
  effectiveThrustStrL,
  effectiveThrustStrR,
} from '../../context/ShipState';
import { autopilotActive, disableAutopilot } from '../../context/AutopilotState';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { attachShipToDock, checkDockingPort } from './docking';
import { applyPhysicsStep } from './step';
import { applyResourceDrain } from './resourceDrain';
import { getCombinedInputs, getManualInput } from './inputs';
import { updateAutopilotThrustOutputs } from './simpleAutopilot';
import { PHYSICS_MAX_DELTA, PHYSICS_MAX_STEP } from './constants';
import { updateEngineAudio } from './engineAudio';
import {
  updateThrusterLights,
  zeroThrusterLights,
  THRUSTER_POINT_LIGHT_COUNT,
  type ThrusterLightActives,
} from './thrusterLight';
import {
  cinematicAutopilotActive,
  neptuneNoFlyZoneActive,
  scrapperIntroActive,
  scrapperWorldPos,
  scrapperWorldQuat,
} from '../../context/CinematicState';
import { shipPosRef } from '../../context/ShipPos';
import { floatingOriginActiveRef, floatingOriginOffsetRef } from '../../context/FloatingOrigin';
import {
  SCRAPPER_PLAYER_OFFSET_X,
  SCRAPPER_PLAYER_OFFSET_Y,
  SCRAPPER_PLAYER_OFFSET_Z,
} from '../../config/scrapperConfig';
import { DEBUG_DISABLE_GRAVITY, DEBUG_FREEZE_COLLISIONS } from '../../config/debugConfig';
import { useInputListeners } from './inputListeners';
import { checkShipDestruction } from './destruction';
import { getActiveMainEngines, applyEngineAsymmetryTorque } from './engineDamage';
import { applyRadiationDamage } from './radiation';
import { getCollidables } from '../../context/CollisionRegistry';

const _spinEuler = new THREE.Vector3();
const _scrapperOffset = new THREE.Vector3();
const _assistForward = new THREE.Vector3();
const _assistRight = new THREE.Vector3();
const _worldPos = new THREE.Vector3();

/** Gameplay plane is world XZ (Y = 0), including when a parent group is banked. */
function clampShipToWorldXZPlane(
  group: THREE.Group,
  physicsPosition: THREE.Vector3,
  velocity: THREE.Vector3
) {
  velocity.y = 0;
  group.getWorldPosition(_worldPos);
  if (Math.abs(_worldPos.y) <= 1e-4) {
    physicsPosition.copy(group.position);
    return;
  }
  _worldPos.y = 0;
  if (group.parent) {
    group.parent.worldToLocal(_worldPos);
    group.position.copy(_worldPos);
  } else {
    group.position.y = 0;
  }
  physicsPosition.copy(group.position);
}

/** HUD/camera follow world position (required when the ship group has a moving parent). */
function syncShipWorldRefs(group: THREE.Group) {
  group.getWorldPosition(minimapShipPosition);
  shipPosRef.current.copy(minimapShipPosition);
  // FloatingOrigin rebases the scene graph; getWorldPosition is render-space. Keep
  // shipPosRef in simulation space for gravity, comms range, and FO focus.
  if (floatingOriginActiveRef.current) {
    shipPosRef.current.sub(floatingOriginOffsetRef.current);
  }
}

const CANCEL_LINEAR_EPS = 1.1; // units/s deadzone
const CANCEL_YAW_EPS = 0.03; // rad/s deadzone
const MAX_VISUAL_THRUST_MULTIPLIER = 3;
type CombinedThrustInputs = ReturnType<typeof getCombinedInputs>;

function resetCombinedInputs(): CombinedThrustInputs {
  return {
    yawLeft: false,
    yawRight: false,
    fwd: false,
    rev: false,
    strL: false,
    strR: false,
    radOut: false,
    radIn: false,
  };
}

interface UseShipPhysicsParams {
  groupRef: React.RefObject<THREE.Group>;
  dockingPortRef: React.RefObject<THREE.Group>;
  initialDockedTo?: string | null;
  /** World-space velocity (units/s) applied once on first free-flight frame — not continuous forcing. Y is ignored (game plane). */
  initialVelocity?: [number, number, number];
  options?: ShipPhysicsOptions;
}

export interface ShipPhysicsOptions {
  /** Master gate: disable all physics integration and key-driven thrust. */
  enabled?: boolean;
  /** Gate keyboard/mobile thrust input capture for this vessel. */
  inputEnabled?: boolean;
  /** Gate thruster/yaw/radial thrust force application. */
  thrusterPhysicsEnabled?: boolean;
  /** Gate gravity/orbital acceleration. */
  orbitalPhysicsEnabled?: boolean;
  /** Gate docking capture checks and docked resource handling. */
  dockingPhysicsEnabled?: boolean;
}

export interface UseShipPhysicsResult {
  thrustForward: React.MutableRefObject<boolean>;
  thrustReverse: React.MutableRefObject<boolean>;
  thrustLeft: React.MutableRefObject<boolean>;
  thrustRight: React.MutableRefObject<boolean>;
  thrustStrafeLeft: React.MutableRefObject<boolean>;
  thrustStrafeRight: React.MutableRefObject<boolean>;
  thrustRadialOut: React.MutableRefObject<boolean>;
  thrustRadialIn: React.MutableRefObject<boolean>;
  releaseParticleTrigger: React.MutableRefObject<boolean>;
  thrusterLightRefs: React.MutableRefObject<(THREE.PointLight | null)[]>;
}

export function useShipPhysics({
  groupRef,
  dockingPortRef,
  initialDockedTo = null,
  initialVelocity,
  options,
}: UseShipPhysicsParams): UseShipPhysicsResult {
  const physicsEnabled = options?.enabled ?? true;
  const inputEnabled = options?.inputEnabled ?? true;
  const thrusterPhysicsEnabled = options?.thrusterPhysicsEnabled ?? true;
  const orbitalPhysicsEnabled = options?.orbitalPhysicsEnabled ?? true;
  const dockingPhysicsEnabled = options?.dockingPhysicsEnabled ?? true;

  const { scene } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const physicsPosition = useRef(new THREE.Vector3());
  const renderPosition = useRef(new THREE.Vector3());
  const didInitPositions = useRef(false);
  const didApplyInitialVelocity = useRef(false);
  const angularVelocity = useRef(0); // yaw rate in rad/s — no drag, persists like linear velocity
  const angularVelocity3 = useRef(new THREE.Vector3());
  const destroyedFired = useRef(false);
  const destroyedSpinSet = useRef(false);
  const dockedTo = useRef<string | null>(initialDockedTo); // collision ID of the docked bay, or null
  const primaryGravityId = useRef<string | null>(null);
  const primaryGravityVelocity = useRef(new THREE.Vector3());

  const thrusterLightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const thrusterLightIntensities = useRef<number[]>(
    Array.from({ length: THRUSTER_POINT_LIGHT_COUNT }, () => 0)
  );
  const inputEnabledRef = useRef(inputEnabled);
  inputEnabledRef.current = inputEnabled && physicsEnabled;

  const {
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
  } = useInputListeners({
    dockedTo,
    velocity,
    groupRef,
    scene,
    physicsPosition,
    inputEnabledRef,
  });

  useEffect(() => {
    if (physicsEnabled && inputEnabled && thrusterPhysicsEnabled) return;
    resetInputs();
  }, [physicsEnabled, inputEnabled, resetInputs, thrusterPhysicsEnabled]);

  // Spawn already docked (e.g. docking tutorial): physics sets dockedTo before any bay overlap,
  // so we must sync HUD / useDockingState with the same ShipDocked path as live docking.
  // Defer past sibling useEffects (NavHUD registers listeners after this ship mounts).
  useEffect(() => {
    const onTutorialShipReset = () => {
      destroyedFired.current = false;
      destroyedSpinSet.current = false;
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      angularVelocity3.current.set(0, 0, 0);
      didApplyInitialVelocity.current = false;
      if (groupRef.current) {
        // Use shipPosRef (set by each tutorial's reset handler) — not always world origin.
        groupRef.current.position.set(
          shipPosRef.current.x,
          shipPosRef.current.y,
          shipPosRef.current.z
        );
        physicsPosition.current.copy(groupRef.current.position);
        renderPosition.current.copy(groupRef.current.position);
      }
    };
    window.addEventListener('TutorialShipReset', onTutorialShipReset);
    return () => window.removeEventListener('TutorialShipReset', onTutorialShipReset);
  }, [groupRef]);

  useEffect(() => {
    if (!dockingPhysicsEnabled) return;
    if (!initialDockedTo) return;
    let cancelled = false;
    const bay = getCollidables().find((c) => c.id === initialDockedTo);
    const m = initialDockedTo.match(/^docking-bay-(.+)$/);
    const fallbackStationId = m ? m[1]! : null;
    const stationId = bay?.stationId ?? fallbackStationId;
    queueMicrotask(() => {
      if (!cancelled) {
        window.dispatchEvent(new CustomEvent('ShipDocked', { detail: { stationId } }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dockingPhysicsEnabled, initialDockedTo]);

  if (!physicsEnabled) {
    return null;
  }
  useFrame((_, delta) => {
    const rawDelta = delta;

    // Clamp total physics time and sub-step for stability on low-FPS devices.
    const cappedDelta = Math.min(delta, PHYSICS_MAX_DELTA);
    const maxStep = PHYSICS_MAX_STEP;
    if (!groupRef.current) return;
    if (!didInitPositions.current) {
      physicsPosition.current.copy(groupRef.current.position);
      renderPosition.current.copy(groupRef.current.position);
      didInitPositions.current = true;
    }

    if (!physicsEnabled) {
      resetInputs();
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
      shipAcceleration.current = 0;
      shipVelocity.set(0, 0, 0);
      effectiveThrustFwd.current = false;
      effectiveThrustRev.current = false;
      effectiveYawLeft.current = false;
      effectiveYawRight.current = false;
      effectiveThrustStrL.current = false;
      effectiveThrustStrR.current = false;
      shipAngularVelocity.current = 0;
      syncShipWorldRefs(groupRef.current);
      groupRef.current.getWorldQuaternion(shipQuaternion);
      return;
    }

    if (dockingPhysicsEnabled && dockedTo.current) {
      didApplyInitialVelocity.current = true;
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
      shipAcceleration.current = 0;
      shipVelocity.set(0, 0, 0);
      effectiveThrustFwd.current = false;
      effectiveThrustRev.current = false;
      effectiveYawLeft.current = false;
      effectiveYawRight.current = false;
      effectiveThrustStrL.current = false;
      effectiveThrustStrR.current = false;
      shipAngularVelocity.current = 0;
      return;
    }

    // Ensure physics runs on the authoritative position, not a smoothed render pose.
    groupRef.current.position.copy(physicsPosition.current);
    if (shipDestroyed.current) {
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
    }

    if (!didApplyInitialVelocity.current && initialVelocity) {
      didApplyInitialVelocity.current = true;
      velocity.current.set(initialVelocity[0], 0, initialVelocity[2]);
    }

    // ── Scrapper intro: pin player ship inside the hold ───────────────────────
    if (scrapperIntroActive.current) {
      _scrapperOffset
        .set(SCRAPPER_PLAYER_OFFSET_X, SCRAPPER_PLAYER_OFFSET_Y, SCRAPPER_PLAYER_OFFSET_Z)
        .applyQuaternion(scrapperWorldQuat);
      groupRef.current.position.copy(scrapperWorldPos).add(_scrapperOffset);
      physicsPosition.current.copy(groupRef.current.position);
      syncShipWorldRefs(groupRef.current);
      velocity.current.set(0, 0, 0);
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      return;
    }

    const controlsLocked = performance.now() < shipControlDisabledUntil.current;

    const propulsionAvailable = canUsePropulsion();

    if (!propulsionAvailable && autopilotActive.current) {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    }

    updateAutopilotThrustOutputs(groupRef.current, velocity.current, {
      controlsLocked,
      shipDestroyed: shipDestroyed.current,
      primaryGravityId,
    });

    let { yawLeft, yawRight, fwd, rev, strL, strR, radOut, radIn } = getCombinedInputs({
      thrustForward,
      thrustReverse,
      thrustLeft,
      thrustRight,
      thrustStrafeLeft,
      thrustStrafeRight,
      thrustRadialOut,
      thrustRadialIn,
    });

    if (shipDestroyed.current || controlsLocked || !propulsionAvailable) {
      ({ yawLeft, yawRight, fwd, rev, strL, strR, radOut, radIn } = resetCombinedInputs());
    }

    if (!thrusterPhysicsEnabled) {
      ({ yawLeft, yawRight, fwd, rev, strL, strR, radOut, radIn } = resetCombinedInputs());
    }

    if (!orbitalPhysicsEnabled) {
      radOut = false;
      radIn = false;
    }

    if (!propulsionAvailable) {
      cinematicThrustForward.current = false;
      cinematicThrustReverse.current = false;
    }

    // Stabiliser (Space held): synthetically activates both keys of every cancel pair so the
    // cancel-assist blocks below fire opposing thrusters on all three axes simultaneously.
    if (stabilizerActive.current) {
      fwd = true;
      rev = true;
      yawLeft = true;
      yawRight = true;
      strL = true;
      strR = true;
    }

    // Opposite-key cancel assist:
    // - W+S (fwd+rev): cancel longitudinal velocity
    // - A+D (yawLeft+yawRight): cancel yaw rate
    // - Q+E (strL+strR): cancel lateral/strafe velocity
    if (fwd && rev) {
      _assistForward.set(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
      const vForward = velocity.current.dot(_assistForward);
      if (Math.abs(vForward) <= CANCEL_LINEAR_EPS) {
        // Snap longitudinal component to zero so assist does not re-pulse.
        velocity.current.addScaledVector(_assistForward, -vForward);
        fwd = false;
        rev = false;
      } else if (vForward > 0) {
        // Moving +forward → apply opposite acceleration (-forward)
        fwd = true;
        rev = false;
      } else {
        fwd = false;
        rev = true;
      }
    }

    if (yawLeft && yawRight) {
      const yawRate = angularVelocity.current;
      if (Math.abs(yawRate) <= CANCEL_YAW_EPS) {
        // Clamp residual angular drift at threshold.
        angularVelocity.current = 0;
        yawLeft = false;
        yawRight = false;
      } else if (yawRate > 0) {
        // Positive yaw rate → apply yaw-left torque
        yawLeft = true;
        yawRight = false;
      } else {
        yawLeft = false;
        yawRight = true;
      }
    }

    if (strL && strR) {
      _assistRight.set(1, 0, 0).applyQuaternion(groupRef.current.quaternion);
      const vRight = velocity.current.dot(_assistRight);
      if (Math.abs(vRight) <= CANCEL_LINEAR_EPS) {
        // Snap lateral component to zero so assist does not re-pulse.
        velocity.current.addScaledVector(_assistRight, -vRight);
        strL = false;
        strR = false;
      } else if (vRight > 0) {
        // Moving +right → apply strafe-left
        strL = true;
        strR = false;
      } else {
        strL = false;
        strR = true;
      }
    }

    // Publish effective thruster states so ThrusterParticles shows the correct
    // visual for cancel-assist and stabilizer thrusts, not just raw key presses.
    effectiveThrustFwd.current = fwd;
    effectiveThrustRev.current = rev;
    effectiveYawLeft.current = yawLeft;
    effectiveYawRight.current = yawRight;
    effectiveThrustStrL.current = strL;
    effectiveThrustStrR.current = strR;

    const manualInput = getManualInput({
      thrustForward,
      thrustReverse,
      thrustLeft,
      thrustRight,
      thrustStrafeLeft,
      thrustStrafeRight,
      thrustRadialOut,
      thrustRadialIn,
    });

    if (cinematicAutopilotActive.current) {
      if (manualInput) {
        cinematicAutopilotActive.current = false;
        cinematicThrustForward.current = false;
        cinematicThrustReverse.current = false;
      }
    }

    if (autopilotActive.current && (manualInput || stabilizerActive.current)) {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    }

    const activeMainEngines = getActiveMainEngines();
    const mainThrust = fwd || (rev && activeMainEngines > 0);
    const rcsThrust = strL || strR || yawLeft || yawRight;
    const anyThrusting = updateEngineAudio({ mainThrust, rcsThrust });
    if (shipDestroyed.current) {
      zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
    }

    const thrusterLightActives: ThrusterLightActives = {
      reverseA: fwd && !mainEngineDisabled.reverseA.current,
      reverseB: fwd && !mainEngineDisabled.reverseB.current,
      forward: rev,
      left: yawLeft,
      right: yawRight,
      strafeLeft: strL,
      strafeRight: strR,
    };

    applyEngineAsymmetryTorque({
      rev,
      activeMainEngines,
      group: groupRef.current,
      angularVelocity,
      cappedDelta,
    });

    const revScale = activeMainEngines / 2;

    let remaining = cappedDelta;
    while (remaining > 0) {
      const dt = Math.min(remaining, maxStep);
      remaining -= dt;
      applyPhysicsStep({
        group: groupRef.current,
        velocity: velocity.current,
        angularVelocity,
        primaryGravityId,
        primaryGravityVelocity: primaryGravityVelocity.current,
        dt,
        anyThrusting,
        disableGravity: DEBUG_DISABLE_GRAVITY || !orbitalPhysicsEnabled,
        freezeCollisions: DEBUG_FREEZE_COLLISIONS,
        yawLeft,
        yawRight,
        fwd,
        rev,
        revScale,
        strL,
        strR,
        radOut,
        radIn,
      });

      updateThrusterLights({
        thrusterLightIntensities,
        thrusterLightRefs,
        actives: thrusterLightActives,
        dt,
      });
    }

    shipAngularVelocity.current = angularVelocity.current;

    if (shipDestroyed.current) {
      _spinEuler.copy(angularVelocity3.current).multiplyScalar(cappedDelta);
      groupRef.current.rotation.x += _spinEuler.x;
      groupRef.current.rotation.z += _spinEuler.z;
    }

    checkShipDestruction({
      destroyedFired,
      destroyedSpinSet,
      angularVelocity,
      angularVelocity3,
      thrustForward,
      thrustReverse,
      thrustLeft,
      thrustRight,
      thrustStrafeLeft,
      thrustStrafeRight,
      thrustRadialOut,
      thrustRadialIn,
    });

    physicsPosition.current.copy(groupRef.current.position);

    shipVelocity.copy(velocity.current);
    groupRef.current.getWorldQuaternion(shipQuaternion);

    const isLinearThrusting = fwd || rev || strL || strR;
    const visualThrustMultiplier = Math.min(thrustMultiplier.current, MAX_VISUAL_THRUST_MULTIPLIER);
    shipAcceleration.current = isLinearThrusting ? THRUST * visualThrustMultiplier : 0;

    applyResourceDrain({
      fwd,
      rev,
      yawLeft,
      yawRight,
      strL,
      strR,
      radOut,
      radIn,
      rawDelta,
    });
    applyRadiationDamage(physicsPosition.current, rawDelta);

    clampShipToWorldXZPlane(groupRef.current, physicsPosition.current, velocity.current);

    syncShipWorldRefs(groupRef.current);
  }, -1);

  // Priority 2: after BodyOrbit (0) — parent to dock and sync world refs for camera/HUD.
  useFrame(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;

    if (!dockingPhysicsEnabled) return;

    if (dockedTo.current) {
      const entry = getCollidables().find((c) => c.id === dockedTo.current);
      if (entry) {
        attachShipToDock(group, entry);
      }
      group.getWorldPosition(physicsPosition.current);
      syncShipWorldRefs(group);
      group.getWorldQuaternion(shipQuaternion);
      return;
    }

    if (neptuneNoFlyZoneActive.current) return;
    checkDockingPort({
      group,
      dockingPort: dockingPortRef.current,
      dockedTo,
      velocity: velocity.current,
    });
    if (dockedTo.current) {
      group.getWorldPosition(physicsPosition.current);
      syncShipWorldRefs(group);
      group.getWorldQuaternion(shipQuaternion);
    }
  }, 2);

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
    thrusterLightRefs,
  };
}
