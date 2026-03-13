import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  THRUST,
  damageHull,
  hullIntegrity,
  cinematicThrustForward,
  cinematicThrustReverse,
  MAIN_ENGINE_HIT_RADIUS,
  MAIN_ENGINE_LOCAL_POS,
  mainEngineDisabled,
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
  railgunTargetEngine,
} from '../context/ShipState';
import { playImpactSoundOverlap, playRailgunHit } from '../context/SoundManager';
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

const ENGINE_TORQUE_SCALE = 0.15;
const DEBUG_RAILGUN_ENGINE_HITS = true;
const DEBUG_ENGINE_DISABLE_CHANGES = true;
const _engineOffset = new THREE.Vector3();
const _engineForce = new THREE.Vector3();
const _engineTorque = new THREE.Vector3();
const _engineForward = new THREE.Vector3();
const _spinEuler = new THREE.Vector3();

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
  const angularVelocity3 = useRef(new THREE.Vector3());
  const prevEngineDisabled = useRef({ a: false, b: false });
  const lastRailgunTarget = useRef<'reverseA' | 'reverseB' | null>(null);
  const destroyedFired = useRef(false);
  const destroyedSpinSet = useRef(false);
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
    const onRailgunHit = (event: Event) => {
      const detail = (event as CustomEvent<{ targetEngine?: 'reverseA' | 'reverseB' | null }>)
        .detail;
      lastRailgunTarget.current = detail?.targetEngine ?? railgunTargetEngine.current;
      playImpactSoundOverlap();
      playRailgunHit();
      const damage = 20 + Math.random() * 10;
      damageHull(damage);
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

        const distA = localPoint.distanceTo(MAIN_ENGINE_LOCAL_POS.reverseA);
        const distB = localPoint.distanceTo(MAIN_ENGINE_LOCAL_POS.reverseB);
        if (distA < closestA) closestA = distA;
        if (distB < closestB) closestB = distB;
      }

      const hitA = closestA <= MAIN_ENGINE_HIT_RADIUS;
      const hitB = closestB <= MAIN_ENGINE_HIT_RADIUS;
      const target = lastRailgunTarget.current ?? railgunTargetEngine.current;
      if (DEBUG_RAILGUN_ENGINE_HITS) {
        // eslint-disable-next-line no-console
        console.debug('[railgun] engine hit check', {
          target,
          hitA,
          hitB,
          closestA: Number.isFinite(closestA) ? closestA.toFixed(2) : 'inf',
          closestB: Number.isFinite(closestB) ? closestB.toFixed(2) : 'inf',
          disabledA: mainEngineDisabled.reverseA.current,
          disabledB: mainEngineDisabled.reverseB.current,
        });
      }
      if (target === 'reverseA' && hitA) {
        mainEngineDisabled.reverseA.current = true;
      } else if (target === 'reverseB' && hitB) {
        mainEngineDisabled.reverseB.current = true;
      }
      if (DEBUG_ENGINE_DISABLE_CHANGES) {
        const nextA = mainEngineDisabled.reverseA.current;
        const nextB = mainEngineDisabled.reverseB.current;
        if (prevEngineDisabled.current.a !== nextA || prevEngineDisabled.current.b !== nextB) {
          // eslint-disable-next-line no-console
          console.debug('[railgun] engine disabled changed', {
            from: { a: prevEngineDisabled.current.a, b: prevEngineDisabled.current.b },
            to: { a: nextA, b: nextB },
            target,
            hitA,
            hitB,
          });
          prevEngineDisabled.current = { a: nextA, b: nextB };
        }
      }
      lastRailgunTarget.current = null;
      railgunTargetEngine.current = null;
    };
    window.addEventListener('RailgunDamagePoints', onDamagePoints);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('RailgunHit', onRailgunHit);
      window.removeEventListener('RailgunDamagePoints', onDamagePoints);
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

    if (shipDestroyed.current) {
      yawLeft = false;
      yawRight = false;
      fwd = false;
      rev = false;
      strL = false;
      strR = false;
    }

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

    const activeMainEngines = shipDestroyed.current
      ? 0
      : (mainEngineDisabled.reverseA.current ? 0 : 1) +
        (mainEngineDisabled.reverseB.current ? 0 : 1);
    const mainThrust = fwd || (rev && activeMainEngines > 0);
    const rcsThrust = strL || strR || yawLeft || yawRight;
    const anyThrusting = updateEngineAudio({ mainThrust, rcsThrust });
    if (shipDestroyed.current && thrusterLightRef.current) {
      thrusterLightIntensity.current = 0;
      thrusterLightRef.current.intensity = 0;
    }

    if (rev && activeMainEngines === 1) {
      const engineLocal = mainEngineDisabled.reverseA.current
        ? MAIN_ENGINE_LOCAL_POS.reverseB
        : MAIN_ENGINE_LOCAL_POS.reverseA;
      _engineOffset.copy(engineLocal).applyQuaternion(groupRef.current.quaternion);
      _engineForward.set(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
      const perEngineForce = THRUST * thrustMultiplier.current * 0.5;
      _engineForce.copy(_engineForward).multiplyScalar(perEngineForce);
      _engineTorque.crossVectors(_engineOffset, _engineForce);
      angularVelocity.current += _engineTorque.y * ENGINE_TORQUE_SCALE * cappedDelta;
    }

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
      });

      updateThrusterLight({
        thrusterLightIntensity,
        thrusterLightRef,
        anyThrusting,
        dt,
      });
    }

    if (shipDestroyed.current) {
      _spinEuler.copy(angularVelocity3.current).multiplyScalar(cappedDelta);
      groupRef.current.rotation.x += _spinEuler.x;
      groupRef.current.rotation.z += _spinEuler.z;
    }

    if (hullIntegrity <= 0 && !destroyedFired.current) {
      destroyedFired.current = true;
      shipDestroyed.current = true;
      cinematicAutopilotActive.current = false;
      cinematicThrustForward.current = false;
      cinematicThrustReverse.current = false;
      thrustForward.current = false;
      thrustReverse.current = false;
      thrustLeft.current = false;
      thrustRight.current = false;
      thrustStrafeLeft.current = false;
      thrustStrafeRight.current = false;
      mainEngineDisabled.reverseA.current = true;
      mainEngineDisabled.reverseB.current = true;
      if (!destroyedSpinSet.current) {
        destroyedSpinSet.current = true;
        angularVelocity.current += (Math.random() < 0.5 ? -1 : 1) * 0.9;
        angularVelocity3.current.set(
          (Math.random() * 2 - 1) * 0.6,
          0,
          (Math.random() * 2 - 1) * 0.6
        );
      }
      window.dispatchEvent(new CustomEvent('ShipDestroyed'));
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
