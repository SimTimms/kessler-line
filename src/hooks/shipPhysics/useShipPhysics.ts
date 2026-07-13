import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { attachShipToDock, checkDockingPort } from './docking';
import { PHYSICS_MAX_DELTA, PHYSICS_MAX_STEP } from './constants';
import { THRUSTER_POINT_LIGHT_COUNT } from './thrusterLight';
import { neptuneNoFlyZoneActive } from '../../context/CinematicState';
import { useInputListeners } from './inputListeners';
import { getCollidables } from '../../context/CollisionRegistry';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { ensureVesselState } from '../../context/VesselStateStore';
import { syncShipWorldRefs } from './helpers/syncShipWorldRefs';
import { runPrimaryPhysicsFrame } from './helpers/runPrimaryPhysicsFrame';

interface UseShipPhysicsParams {
  vesselId?: string;
  selfCollisionId?: string;
  groupRef: React.RefObject<THREE.Group>;
  dockingPortRef: React.RefObject<THREE.Group>;
  initialDockedTo?: string | null;
  /** World-space velocity (units/s) applied once on first free-flight frame — not continuous forcing. Y is ignored (game plane). */
  initialVelocity?: [number, number, number];
  options?: ShipPhysicsOptions;
}

export interface ShipPhysicsOptions {
  /** Whether this vessel writes world position into player HUD/camera refs. */
  publishToPlayerRefs?: boolean;
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
  /** Per-vessel yaw authority scale (1 = default player-ship yaw response). */
  yawThrustScale?: number;
  /** Local pivot point used for yaw rotation; set to shift yaw around nose/tail. */
  yawPivotLocal?: [number, number, number];
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
  vesselId = PLAYER_VESSEL_ID,
  selfCollisionId,
  groupRef,
  dockingPortRef,
  initialDockedTo = null,
  initialVelocity,
  options,
}: UseShipPhysicsParams): UseShipPhysicsResult {
  const vesselState = ensureVesselState(vesselId);
  const publishToPlayerRefs = options?.publishToPlayerRefs ?? vesselId === PLAYER_VESSEL_ID;
  const physicsEnabled = options?.enabled ?? true;
  const inputEnabled = options?.inputEnabled ?? true;
  const thrusterPhysicsEnabled = options?.thrusterPhysicsEnabled ?? true;
  const orbitalPhysicsEnabled = options?.orbitalPhysicsEnabled ?? true;
  const dockingPhysicsEnabled = options?.dockingPhysicsEnabled ?? true;
  const yawThrustScale = options?.yawThrustScale ?? 1;
  const yawPivotLocal = options?.yawPivotLocal;

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
  const didLogDockFrameError = useRef(false);
  const dockedTo = useRef<string | null>(initialDockedTo); // collision ID of the docked bay, or null
  const primaryGravityId = useRef<string | null>(null);
  const primaryGravityVelocity = useRef(new THREE.Vector3());
  const yawPivotLocalRef = useRef<THREE.Vector3 | null>(null);

  const thrusterLightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const thrusterLightIntensities = useRef<number[]>(
    Array.from({ length: THRUSTER_POINT_LIGHT_COUNT }, () => 0)
  );
  const inputEnabledRef = useRef(inputEnabled && physicsEnabled);
  useEffect(() => {
    inputEnabledRef.current = inputEnabled && physicsEnabled;
  }, [inputEnabled, physicsEnabled]);
  useEffect(() => {
    if (!yawPivotLocal) {
      yawPivotLocalRef.current = null;
      return;
    }
    if (!yawPivotLocalRef.current) {
      yawPivotLocalRef.current = new THREE.Vector3();
    }
    yawPivotLocalRef.current.set(yawPivotLocal[0], yawPivotLocal[1], yawPivotLocal[2]);
  }, [yawPivotLocal]);

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
    vesselId,
    vesselState,
    dockedTo,
    velocity,
    groupRef,
    scene,
    physicsPosition,
    inputEnabledRef,
    listenersEnabled: physicsEnabled,
  });

  useEffect(() => {
    if (!physicsEnabled) return;
    if (physicsEnabled && inputEnabled && thrusterPhysicsEnabled) return;
    resetInputs();
  }, [physicsEnabled, inputEnabled, resetInputs, thrusterPhysicsEnabled]);

  useEffect(() => {
    if (!physicsEnabled) return;
    if (!publishToPlayerRefs) return;
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
  }, [dockingPhysicsEnabled, initialDockedTo, physicsEnabled, publishToPlayerRefs]);

  useFrame((_, delta) => {
    if (!physicsEnabled) return;
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
    runPrimaryPhysicsFrame({
      vesselId,
      selfCollisionId: selfCollisionId ?? vesselId,
      group: groupRef.current,
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
      primaryGravityVelocity: primaryGravityVelocity.current,
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
      yawPivotLocal: yawPivotLocalRef.current,
    });
  }, -1);

  // Priority 2: after BodyOrbit (0) — parent to dock and sync world refs for camera/HUD.
  useFrame(() => {
    try {
      if (!physicsEnabled) return;
      if (!groupRef.current) return;
      const group = groupRef.current;

      if (!dockingPhysicsEnabled) return;

      if (dockedTo.current) {
        const entry = getCollidables().find((c) => c.id === dockedTo.current);
        if (entry) {
          attachShipToDock(group, entry);
        }
        group.getWorldPosition(physicsPosition.current);
        syncShipWorldRefs(group, publishToPlayerRefs);
        group.getWorldQuaternion(vesselState.shipQuaternion);
        return;
      }

      if (neptuneNoFlyZoneActive.current) return;
      checkDockingPort({
        group,
        dockingPort: dockingPortRef.current,
        dockedTo,
        velocity: velocity.current,
        selfCollisionId: selfCollisionId ?? vesselId,
        emitDockingEvents: publishToPlayerRefs,
      });
      if (dockedTo.current) {
        group.getWorldPosition(physicsPosition.current);
        syncShipWorldRefs(group, publishToPlayerRefs);
        group.getWorldQuaternion(vesselState.shipQuaternion);
      }
    } catch (error) {
      // Guard rendering from docking callback failures while preserving diagnostics.
      if (!didLogDockFrameError.current) {
        didLogDockFrameError.current = true;
        console.error('[useShipPhysics] Docking frame failed', error);
      }
    }
  }, 0);

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
