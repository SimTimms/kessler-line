import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  THRUST,
  hullIntegrity,
  cinematicThrustForward,
  cinematicThrustReverse,
  mobileThrustForward,
  mobileThrustLeft,
  mobileThrustReverse,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
  shipVelocity,
  shipAcceleration,
  shipQuaternion,
  shipDestroyed,
  shipControlDisabledUntil,
  thrustMultiplier,
} from '../context/ShipState';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import {
  applyDockedState,
  applyPhysicsStep,
  applyResourceDrain,
  checkDockingPort,
  getCombinedInputs,
  DELTA_SPIKE_THRESHOLD,
  PHYSICS_MAX_DELTA,
  PHYSICS_MAX_STEP,
  updateEngineAudio,
  updateThrusterLight,
} from './shipPhysics';
import { cinematicAutopilotActive, neptuneNoFlyZoneActive } from '../context/CinematicState';

interface UseShipPhysicsParams {
  groupRef: React.RefObject<THREE.Group>;
  dockingPortRef: React.RefObject<THREE.Group>;
  positionRef?: { current: THREE.Vector3 };
}

export interface UseShipPhysicsResult {
  thrustForward: React.MutableRefObject<boolean>;
  thrustReverse: React.MutableRefObject<boolean>;
  thrustLeft: React.MutableRefObject<boolean>;
  thrustRight: React.MutableRefObject<boolean>;
  thrustStrafeLeft: React.MutableRefObject<boolean>;
  thrustStrafeRight: React.MutableRefObject<boolean>;
  releaseParticleTrigger: React.MutableRefObject<boolean>;
  thrusterLightRef: React.RefObject<THREE.PointLight>;
}

export function useShipPhysics({
  groupRef,
  dockingPortRef,
  positionRef,
}: UseShipPhysicsParams): UseShipPhysicsResult {
  const DEBUG_DISABLE_GRAVITY = false;
  const DEBUG_FREEZE_COLLISIONS = false;
  const DEBUG_LOG_DELTA_SPIKES = false;
  const DEBUG_SMOOTH_RENDER = true;
  const RENDER_SMOOTHING = 14;
  const velocity = useRef(new THREE.Vector3());
  const physicsPosition = useRef(new THREE.Vector3());
  const renderPosition = useRef(new THREE.Vector3());
  const didInitPositions = useRef(false);
  const angularVelocity = useRef(0); // yaw rate in rad/s — no drag, persists like linear velocity
  const dockedTo = useRef<string | null>(null); // collision ID of the docked bay, or null
  const primaryGravityId = useRef<string | null>(null);
  const primaryGravityVelocity = useRef(new THREE.Vector3());

  const releaseParticleTrigger = useRef(false);
  const thrusterLightRef = useRef<THREE.PointLight>(null!);
  const thrusterLightIntensity = useRef(0);

  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false); // A: yaw left
  const thrustRight = useRef(false); // D: yaw right
  const thrustStrafeLeft = useRef(false); // Q: strafe port
  const thrustStrafeRight = useRef(false); // E: strafe starboard

  useEffect(() => {
    const onRailgunHit = () => {
      angularVelocity.current += (Math.random() < 0.5 ? -1 : 1) * 3.2;
      shipControlDisabledUntil.current = Math.max(
        shipControlDisabledUntil.current,
        performance.now() + 2500
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = true;
      if (e.code === 'KeyS') thrustReverse.current = true;
      if (e.code === 'KeyA') thrustLeft.current = true;
      if (e.code === 'KeyD') thrustRight.current = true;
      if (e.code === 'KeyE') thrustStrafeLeft.current = true;
      if (e.code === 'KeyQ') thrustStrafeRight.current = true;
      if (e.code === 'Space' && dockedTo.current) {
        dockedTo.current = null;
        window.dispatchEvent(new CustomEvent('ShipUndocked'));
        if (groupRef.current) {
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
          velocity.current.copy(forward.multiplyScalar(4)); // 4 m/s release velocity
        }
        releaseParticleTrigger.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = false;
      if (e.code === 'KeyS') thrustReverse.current = false;
      if (e.code === 'KeyA') thrustLeft.current = false;
      if (e.code === 'KeyD') thrustRight.current = false;
      if (e.code === 'KeyE') thrustStrafeLeft.current = false;
      if (e.code === 'KeyQ') thrustStrafeRight.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('RailgunHit', onRailgunHit);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('RailgunHit', onRailgunHit);
    };
  }, [groupRef]);

  useFrame((_, delta) => {
    const rawDelta = delta;
    if (DEBUG_LOG_DELTA_SPIKES && rawDelta > DELTA_SPIKE_THRESHOLD) {
      // eslint-disable-next-line no-console
      console.debug(`[physics] delta spike: ${rawDelta.toFixed(4)}s`);
    }

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
      return;
    }

    if (
      applyDockedState({
        group: groupRef.current,
        dockedTo,
        thrusterLightRef,
        thrusterLightIntensity,
        positionRef,
        rawDelta,
      })
    ) {
      updateEngineAudio({ mainThrust: false, rcsThrust: false });
      return;
    }

    let { yawLeft, yawRight, fwd, rev, strL, strR } = getCombinedInputs({
      thrustForward,
      thrustReverse,
      thrustLeft,
      thrustRight,
      thrustStrafeLeft,
      thrustStrafeRight,
    });

    const controlsLocked = performance.now() < shipControlDisabledUntil.current;
    if (controlsLocked) {
      yawLeft = false;
      yawRight = false;
      fwd = false;
      rev = false;
      strL = false;
      strR = false;
    }

    if (cinematicAutopilotActive.current) {
      const manualInput =
        thrustForward.current ||
        thrustReverse.current ||
        thrustLeft.current ||
        thrustRight.current ||
        thrustStrafeLeft.current ||
        thrustStrafeRight.current ||
        mobileThrustForward.current ||
        mobileThrustReverse.current ||
        mobileThrustLeft.current ||
        mobileThrustRight.current ||
        mobileThrustStrafeLeft.current ||
        mobileThrustStrafeRight.current;

      if (manualInput) {
        cinematicAutopilotActive.current = false;
        cinematicThrustForward.current = false;
        cinematicThrustReverse.current = false;
      }
    }

    const mainThrust = fwd || rev;
    const rcsThrust = strL || strR || yawLeft || yawRight;
    const anyThrusting = updateEngineAudio({ mainThrust, rcsThrust });

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
        strL,
        strR,
      });

      updateThrusterLight({
        thrusterLightIntensity,
        thrusterLightRef,
        anyThrusting,
        dt,
      });
    }

    if (hullIntegrity <= 0) {
      shipDestroyed.current = true;
      groupRef.current.visible = false;
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      window.dispatchEvent(new CustomEvent('ShipDestroyed'));
      return;
    }

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

    if (!neptuneNoFlyZoneActive.current) {
      checkDockingPort({
        group: groupRef.current,
        dockingPort: dockingPortRef.current,
        dockedTo,
        velocity: velocity.current,
      });
    }

    // ── Lock to Y=0 plane ─────────────────────────────────────────────────────
    velocity.current.y = 0;
    physicsPosition.current.y = 0;
    groupRef.current.position.y = 0;

    if (DEBUG_SMOOTH_RENDER) {
      const t = 1 - Math.exp(-RENDER_SMOOTHING * rawDelta);
      renderPosition.current.lerp(physicsPosition.current, t);
      groupRef.current.position.copy(renderPosition.current);
      if (positionRef) positionRef.current.copy(renderPosition.current);
      minimapShipPosition.copy(renderPosition.current);
    } else {
      if (positionRef) positionRef.current.copy(physicsPosition.current);
      minimapShipPosition.copy(physicsPosition.current);
    }
  }, -1);

  return {
    thrustForward,
    thrustReverse,
    thrustLeft,
    thrustRight,
    thrustStrafeLeft,
    thrustStrafeRight,
    releaseParticleTrigger,
    thrusterLightRef,
  };
}
