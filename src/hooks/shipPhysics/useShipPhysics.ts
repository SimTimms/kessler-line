import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
} from '../../context/ShipState';
import { autopilotActive, disableAutopilot } from '../../context/AutopilotState';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { applyDockedState, checkDockingPort } from './docking';
import { applyPhysicsStep } from './step';
import { applyResourceDrain } from './resourceDrain';
import { getCombinedInputs, getManualInput } from './inputs';
import { PHYSICS_MAX_DELTA, PHYSICS_MAX_STEP } from './constants';
import { updateEngineAudio } from './engineAudio';
import { updateThrusterLight } from './thrusterLight';
import {
  cinematicAutopilotActive,
  neptuneNoFlyZoneActive,
  scrapperIntroActive,
  scrapperWorldPos,
  scrapperWorldQuat,
} from '../../context/CinematicState';
import { shipPosRef } from '../../context/ShipPos';
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

const _spinEuler = new THREE.Vector3();
const _scrapperOffset = new THREE.Vector3();

interface UseShipPhysicsParams {
  groupRef: React.RefObject<THREE.Group>;
  dockingPortRef: React.RefObject<THREE.Group>;
  initialDockedTo?: string | null;
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
  thrusterLightRef: React.RefObject<THREE.PointLight>;
}

export function useShipPhysics({
  groupRef,
  dockingPortRef,
  initialDockedTo = null,
}: UseShipPhysicsParams): UseShipPhysicsResult {
  const velocity = useRef(new THREE.Vector3());
  const physicsPosition = useRef(new THREE.Vector3());
  const renderPosition = useRef(new THREE.Vector3());
  const didInitPositions = useRef(false);
  const angularVelocity = useRef(0); // yaw rate in rad/s — no drag, persists like linear velocity
  const angularVelocity3 = useRef(new THREE.Vector3());
  const destroyedFired = useRef(false);
  const destroyedSpinSet = useRef(false);
  const dockedTo = useRef<string | null>(initialDockedTo); // collision ID of the docked bay, or null
  const primaryGravityId = useRef<string | null>(null);
  const primaryGravityVelocity = useRef(new THREE.Vector3());

  const thrusterLightRef = useRef<THREE.PointLight>(null!);
  const thrusterLightIntensity = useRef(0);

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
  } = useInputListeners({ dockedTo, velocity, groupRef });

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
    // Ensure physics runs on the authoritative position, not a smoothed render pose.
    groupRef.current.position.copy(physicsPosition.current);
    if (shipDestroyed.current) {
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
    }

    if (
      applyDockedState({
        group: groupRef.current,
        dockedTo,
        thrusterLightRef,
        thrusterLightIntensity,
        rawDelta,
      })
    ) {
      // Keep authoritative refs synced while docked so follow camera and
      // undock handoff use the actual docked transform (no snap to stale spawn).
      physicsPosition.current.copy(groupRef.current.position);
      shipPosRef.current.copy(physicsPosition.current);
      minimapShipPosition.copy(physicsPosition.current);
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      return;
    }

    // ── Scrapper intro: pin player ship inside the hold ───────────────────────
    if (scrapperIntroActive.current) {
      _scrapperOffset
        .set(SCRAPPER_PLAYER_OFFSET_X, 0, SCRAPPER_PLAYER_OFFSET_Z)
        .applyQuaternion(scrapperWorldQuat);
      groupRef.current.position.copy(scrapperWorldPos).add(_scrapperOffset);
      physicsPosition.current.copy(groupRef.current.position);
      shipPosRef.current.copy(physicsPosition.current);
      minimapShipPosition.copy(physicsPosition.current);
      velocity.current.set(0, 0, 0);
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      return;
    }

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

    if (shipDestroyed.current) {
      yawLeft = false;
      yawRight = false;
      fwd = false;
      rev = false;
      strL = false;
      strR = false;
      radOut = false;
      radIn = false;
    }

    const controlsLocked = performance.now() < shipControlDisabledUntil.current;
    if (controlsLocked) {
      yawLeft = false;
      yawRight = false;
      fwd = false;
      rev = false;
      strL = false;
      strR = false;
      radOut = false;
      radIn = false;
    }

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

    if (autopilotActive.current && manualInput) {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    }

    const activeMainEngines = getActiveMainEngines();
    const mainThrust = fwd || (rev && activeMainEngines > 0);
    const rcsThrust = strL || strR || yawLeft || yawRight;
    const anyThrusting = updateEngineAudio({ mainThrust, rcsThrust });
    if (shipDestroyed.current && thrusterLightRef.current) {
      thrusterLightIntensity.current = 0;
      thrusterLightRef.current.intensity = 0;
    }

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
        disableGravity: DEBUG_DISABLE_GRAVITY,
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

      updateThrusterLight({
        thrusterLightIntensity,
        thrusterLightRef,
        anyThrusting,
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
    shipAcceleration.current = isLinearThrusting ? THRUST * thrustMultiplier.current : 0;

    const keysHeld =
      (fwd ? 1 : 0) +
      (rev ? 1 : 0) +
      (yawLeft ? 1 : 0) +
      (yawRight ? 1 : 0) +
      (strL ? 1 : 0) +
      (strR ? 1 : 0);
    applyResourceDrain({ keysHeld, rawDelta });
    applyRadiationDamage(physicsPosition.current, rawDelta);

    if (!neptuneNoFlyZoneActive.current) {
      checkDockingPort({
        group: groupRef.current,
        dockingPort: dockingPortRef.current,
        dockedTo,
        velocity: velocity.current,
      });
    }

    velocity.current.y = 0;
    physicsPosition.current.y = 0;
    groupRef.current.position.y = 0;

    shipPosRef.current.copy(physicsPosition.current);
    minimapShipPosition.copy(physicsPosition.current);
  }, -1);

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
    thrusterLightRef,
  };
}
