import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { THRUST } from '../../../context/ShipState';
import { autopilotActive, disableAutopilot } from '../../../context/AutopilotState';
import {
  cinematicAutopilotActive,
  scrapperIntroActive,
  scrapperWorldPos,
  scrapperWorldQuat,
} from '../../../context/CinematicState';
import {
  SCRAPPER_PLAYER_OFFSET_X,
  SCRAPPER_PLAYER_OFFSET_Y,
  SCRAPPER_PLAYER_OFFSET_Z,
} from '../../../config/scrapperConfig';
import { DEBUG_DISABLE_GRAVITY, DEBUG_FREEZE_COLLISIONS } from '../../../config/debugConfig';
import { cinematicThrustForward, cinematicThrustReverse } from '../../../context/PlayerShipState';
import { canVesselUsePropulsion, type VesselRuntimeState } from '../../../context/VesselStateStore';
import { updateAutopilotThrustOutputs } from '../simpleAutopilot';
import { getCombinedInputs, getManualInput } from '../inputs';
import { resetCombinedInputs } from './resetCombinedInputs';
import { updateEngineAudio } from '../engineAudio';
import { applyPhysicsStep } from '../step';
import { applyResourceDrain } from '../resourceDrain';
import { applyRadiationDamage } from '../radiation';
import { applyFastTravelZoneUpdate, applyNormalTravelEntryBrake, applyFastTravelSpeedHazards, gateLongitudinalThrustForOverspeed } from '../fastTravel';
import {
  updateThrusterLights,
  zeroThrusterLights,
  type ThrusterLightActives,
} from '../thrusterLight';
import { getActiveMainEngines, applyEngineAsymmetryTorque } from '../engineDamage';
import { checkShipDestruction } from '../destruction';
import { clampShipToWorldXZPlane } from './clampShipToWorldXZPlane';
import { syncShipWorldRefs } from './syncShipWorldRefs';
import { getCollidables } from '../../../context/CollisionRegistry';
import { getDockCaptureProfile } from '../../../utils/dockingCapture';
import { disablesShipPhysicsWhenDocked } from '../../../config/dockCaptureConfig';

const _spinEuler = new THREE.Vector3();
const _scrapperOffset = new THREE.Vector3();
const _assistForward = new THREE.Vector3();
const _assistRight = new THREE.Vector3();

const CANCEL_LINEAR_EPS = 1.1; // units/s deadzone
const CANCEL_YAW_EPS = 0.03; // rad/s deadzone
const MAX_VISUAL_THRUST_MULTIPLIER = 3;

interface RunPrimaryPhysicsFrameParams {
  vesselId: string;
  selfCollisionId: string;
  group: THREE.Group;
  rawDelta: number;
  cappedDelta: number;
  maxStep: number;
  vesselState: VesselRuntimeState;
  publishToPlayerRefs: boolean;
  dockingPhysicsEnabled: boolean;
  dockedTo: MutableRefObject<string | null>;
  didApplyInitialVelocity: MutableRefObject<boolean>;
  initialVelocity?: [number, number, number];
  velocity: MutableRefObject<THREE.Vector3>;
  angularVelocity: MutableRefObject<number>;
  angularVelocity3: MutableRefObject<THREE.Vector3>;
  physicsPosition: MutableRefObject<THREE.Vector3>;
  primaryGravityId: MutableRefObject<string | null>;
  primaryGravityVelocity: THREE.Vector3;
  thrustForward: MutableRefObject<boolean>;
  thrustReverse: MutableRefObject<boolean>;
  thrustLeft: MutableRefObject<boolean>;
  thrustRight: MutableRefObject<boolean>;
  thrustStrafeLeft: MutableRefObject<boolean>;
  thrustStrafeRight: MutableRefObject<boolean>;
  thrustRadialOut: MutableRefObject<boolean>;
  thrustRadialIn: MutableRefObject<boolean>;
  stabilizerActive: MutableRefObject<boolean>;
  destroyedFired: MutableRefObject<boolean>;
  destroyedSpinSet: MutableRefObject<boolean>;
  thrusterLightRefs: MutableRefObject<(THREE.PointLight | null)[]>;
  thrusterLightIntensities: MutableRefObject<number[]>;
  thrusterPhysicsEnabled: boolean;
  orbitalPhysicsEnabled: boolean;
  yawThrustScale: number;
  yawPivotLocal: THREE.Vector3 | null;
  dockingTransitionActive?: boolean;
  dockReentryBlock?: MutableRefObject<string | null>;
  dockingPortDisabledUntil?: MutableRefObject<number>;
}

export function runPrimaryPhysicsFrame({
  vesselId,
  selfCollisionId,
  group,
  rawDelta,
  cappedDelta,
  maxStep,
  vesselState,
  publishToPlayerRefs,
  dockingPhysicsEnabled,
  dockedTo,
  didApplyInitialVelocity,
  initialVelocity,
  velocity,
  angularVelocity,
  angularVelocity3,
  physicsPosition,
  primaryGravityId,
  primaryGravityVelocity,
  thrustForward,
  thrustReverse,
  thrustLeft,
  thrustRight,
  thrustStrafeLeft,
  thrustStrafeRight,
  thrustRadialOut,
  thrustRadialIn,
  stabilizerActive,
  destroyedFired,
  destroyedSpinSet,
  thrusterLightRefs,
  thrusterLightIntensities,
  thrusterPhysicsEnabled,
  orbitalPhysicsEnabled,
  yawThrustScale,
  yawPivotLocal,
  dockingTransitionActive = false,
  dockReentryBlock,
  dockingPortDisabledUntil,
}: RunPrimaryPhysicsFrameParams): void {
  if (dockingPhysicsEnabled && dockingTransitionActive) {
    didApplyInitialVelocity.current = true;
    velocity.current.set(0, 0, 0);
    angularVelocity.current = 0;
    updateEngineAudio({ mainThrust: false, rcsThrust: false });
    zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
    vesselState.shipAcceleration.current = 0;
    vesselState.shipVelocity.set(0, 0, 0);
    vesselState.effectiveThrustFwd.current = false;
    vesselState.effectiveThrustRev.current = false;
    vesselState.effectiveYawLeft.current = false;
    vesselState.effectiveYawRight.current = false;
    vesselState.effectiveThrustStrL.current = false;
    vesselState.effectiveThrustStrR.current = false;
    vesselState.shipAngularVelocity.current = 0;
    return;
  }

  // Station/landing docks freeze ship physics; towable docks (cargo) keep flying.
  // If the dock collider is temporarily unmounted (e.g. cargo helper hidden while towed),
  // do NOT freeze as a fallback — that would incorrectly lock flight controls.
  if (dockingPhysicsEnabled && dockedTo.current) {
    const dockEntry = getCollidables().find((c) => c.id === dockedTo.current);
    const freezeShip =
      dockEntry != null && disablesShipPhysicsWhenDocked(getDockCaptureProfile(dockEntry));
    if (freezeShip) {
      didApplyInitialVelocity.current = true;
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
      vesselState.shipAcceleration.current = 0;
      vesselState.shipVelocity.set(0, 0, 0);
      vesselState.effectiveThrustFwd.current = false;
      vesselState.effectiveThrustRev.current = false;
      vesselState.effectiveYawLeft.current = false;
      vesselState.effectiveYawRight.current = false;
      vesselState.effectiveThrustStrL.current = false;
      vesselState.effectiveThrustStrR.current = false;
      vesselState.shipAngularVelocity.current = 0;
      return;
    }
  }

  // Ensure physics runs on the authoritative position, not a smoothed render pose.
  group.position.copy(physicsPosition.current);
  if (vesselState.shipDestroyed.current) {
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
    group.position.copy(scrapperWorldPos).add(_scrapperOffset);
    physicsPosition.current.copy(group.position);
    syncShipWorldRefs(group, publishToPlayerRefs);
    velocity.current.set(0, 0, 0);
    updateEngineAudio({ mainThrust: false, rcsThrust: false });
    return;
  }

  const controlsLocked = performance.now() < vesselState.shipControlDisabledUntil.current;

  const propulsionAvailable = canVesselUsePropulsion(vesselId);

  if (publishToPlayerRefs && !propulsionAvailable && autopilotActive.current) {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  }

  if (publishToPlayerRefs) {
    updateAutopilotThrustOutputs(group, velocity.current, {
      controlsLocked,
      shipDestroyed: vesselState.shipDestroyed.current,
      primaryGravityId,
    });
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

  if (vesselState.shipDestroyed.current || controlsLocked || !propulsionAvailable) {
    ({ yawLeft, yawRight, fwd, rev, strL, strR, radOut, radIn } = resetCombinedInputs());
  }

  if (!thrusterPhysicsEnabled) {
    ({ yawLeft, yawRight, fwd, rev, strL, strR, radOut, radIn } = resetCombinedInputs());
  }

  if (!orbitalPhysicsEnabled) {
    radOut = false;
    radIn = false;
  }

  if (publishToPlayerRefs && !propulsionAvailable) {
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
    _assistForward.set(0, 0, 1).applyQuaternion(group.quaternion);
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
    _assistRight.set(1, 0, 0).applyQuaternion(group.quaternion);
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

  ({ fwd, rev } = gateLongitudinalThrustForOverspeed(
    velocity.current,
    group.quaternion,
    fwd,
    rev
  ));

  // Publish effective thruster states so ThrusterParticles shows the correct
  // visual for cancel-assist and stabilizer thrusts, not just raw key presses.
  vesselState.effectiveThrustFwd.current = fwd;
  vesselState.effectiveThrustRev.current = rev;
  vesselState.effectiveYawLeft.current = yawLeft;
  vesselState.effectiveYawRight.current = yawRight;
  vesselState.effectiveThrustStrL.current = strL;
  vesselState.effectiveThrustStrR.current = strR;

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

  if (publishToPlayerRefs && cinematicAutopilotActive.current) {
    if (manualInput) {
      cinematicAutopilotActive.current = false;
      cinematicThrustForward.current = false;
      cinematicThrustReverse.current = false;
    }
  }

  if (publishToPlayerRefs && autopilotActive.current && (manualInput || stabilizerActive.current)) {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  }

  const activeMainEngines = getActiveMainEngines(vesselState);
  const mainThrust = fwd || (rev && activeMainEngines > 0);
  const rcsThrust = strL || strR || yawLeft || yawRight;
  const anyThrusting = updateEngineAudio({ mainThrust, rcsThrust });
  if (vesselState.shipDestroyed.current) {
    zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);
  }

  const thrusterLightActives: ThrusterLightActives = {
    reverseA: fwd && !vesselState.mainEngineDisabled.reverseA.current,
    reverseB: fwd && !vesselState.mainEngineDisabled.reverseB.current,
    forward: rev,
    left: yawLeft,
    right: yawRight,
    strafeLeft: strL,
    strafeRight: strR,
  };

  applyEngineAsymmetryTorque({
    vesselState,
    rev,
    activeMainEngines,
    group,
    angularVelocity,
    cappedDelta,
  });

  const revScale = activeMainEngines / 2;

  const fastTravelMultiplier = applyFastTravelZoneUpdate(physicsPosition.current);

  let remaining = cappedDelta;
  while (remaining > 0) {
    // Freeze-on-dock partners already returned above. Towable cargo must keep
    // integrating so the ship can fly while the container follows.
    const dt = Math.min(remaining, maxStep);
    remaining -= dt;
    applyPhysicsStep({
      group,
      velocity: velocity.current,
      angularVelocity,
      primaryGravityId,
      primaryGravityVelocity,
      thrustMultiplierRef: vesselState.thrustMultiplier,
      fastTravelMultiplier,
      dt,
      anyThrusting,
      disableGravity: DEBUG_DISABLE_GRAVITY || !orbitalPhysicsEnabled,
      freezeCollisions: DEBUG_FREEZE_COLLISIONS,
      selfCollisionId,
      yawThrustScale,
      yawPivotLocal,
      yawLeft,
      yawRight,
      fwd,
      rev,
      revScale,
      strL,
      strR,
      radOut,
      radIn,
      collisionOptions: {
        vesselId,
        dockedTo,
        emitDockingEvents: publishToPlayerRefs,
        dockReentryBlock,
        dockingPortDisabledUntil,
      },
    });

    updateThrusterLights({
      thrusterLightIntensities,
      thrusterLightRefs,
      actives: thrusterLightActives,
      dt,
    });
  }

  // Shed fast-travel speed after integrate so entry braking wins over thrust this frame.
  applyNormalTravelEntryBrake(velocity, cappedDelta);
  applyFastTravelSpeedHazards(velocity, vesselId, vesselState, publishToPlayerRefs);

  vesselState.shipAngularVelocity.current = angularVelocity.current;

  if (vesselState.shipDestroyed.current) {
    _spinEuler.copy(angularVelocity3.current).multiplyScalar(cappedDelta);
    group.rotation.x += _spinEuler.x;
    group.rotation.z += _spinEuler.z;
  }

  checkShipDestruction({
    vesselId,
    vesselState,
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
    cinematicThrustForwardRef: publishToPlayerRefs ? cinematicThrustForward : undefined,
    cinematicThrustReverseRef: publishToPlayerRefs ? cinematicThrustReverse : undefined,
  });

  physicsPosition.current.copy(group.position);

  vesselState.shipVelocity.copy(velocity.current);
  group.getWorldQuaternion(vesselState.shipQuaternion);

  const isLinearThrusting = fwd || rev || strL || strR;
  const visualThrustMultiplier = Math.min(
    vesselState.thrustMultiplier.current,
    MAX_VISUAL_THRUST_MULTIPLIER
  );
  vesselState.shipAcceleration.current = isLinearThrusting ? THRUST * visualThrustMultiplier : 0;

  applyResourceDrain({
    vesselId,
    vesselState,
    trackHudRates: publishToPlayerRefs,
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
  applyRadiationDamage(
    vesselId,
    vesselState,
    physicsPosition.current,
    rawDelta,
    publishToPlayerRefs
  );

  clampShipToWorldXZPlane(group, physicsPosition.current, velocity.current);

  syncShipWorldRefs(group, publishToPlayerRefs);
}
