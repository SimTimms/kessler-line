import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  attachShipToDock,
  checkDockingPort,
  computeUndockReleaseDirection,
  detachShipFromDock,
  isShipWithinDockCaptureRange,
} from './docking';
import { getDockCaptureProfile } from '../../utils/dockingCapture';
import { disablesShipPhysicsWhenDocked } from '../../config/dockCaptureConfig';
import { PHYSICS_MAX_DELTA, PHYSICS_MAX_STEP } from './constants';
import { THRUSTER_POINT_LIGHT_COUNT } from './thrusterLight';
import { neptuneNoFlyZoneActive } from '../../context/CinematicState';
import { useInputListeners } from './inputListeners';
import { getCollidables } from '../../context/CollisionRegistry';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { ensureVesselState } from '../../context/VesselStateStore';
import { syncShipWorldRefs } from './helpers/syncShipWorldRefs';
import { runPrimaryPhysicsFrame } from './helpers/runPrimaryPhysicsFrame';
import { EVENT_DEBUG_JUMP_DOCK } from '../../config/keybindings';
import { shipVelocity } from '../../context/ShipState';
import { playDockAlignSound } from '../../sound/SoundManager';
import { SHIP_UNDOCK_DOCKING_COOLDOWN_MS } from '../../config/shipConfig';
import { isLandingPadElevatorReady } from '../../context/LandingPadElevator';
import {
  clearAllDockPermissions,
  hasDockPermission,
  revokeDockPermission,
  setDockPermissionCandidate,
} from '../../context/DockPermissionState';
import { getDock } from '../../context/DockablePartnerStore';

const LANDING_ALIGN_SPEED = 2.8; // units/s
const LANDING_DESCEND_SPEED = 2.8; // units/s
const LANDING_ASCEND_SPEED = 2.8; // units/s
const LANDING_ROTATE_SPEED = 1.1; // rad/s (25% of prior 4.4)
/** Dock-local Y used when debug-jumping into a hover landing approach. */
const DEBUG_JUMP_HOVER_LOCAL_Y = 14;
const LOCAL_DOCK_FORWARD_QUAT = new THREE.Quaternion();
const _hoverUndockReleaseDir = new THREE.Vector3();
const _candidateShipPos = new THREE.Vector3();
const _candidateDockPos = new THREE.Vector3();
const MIN_DOCK_PERMISSION_PROMPT_RADIUS = 80;

function stationIdFromDockEntryId(dockEntryId: string): string | null {
  const match = /^docking-bay-(.+)$/.exec(dockEntryId);
  return match ? match[1] ?? null : null;
}

function moveTowardScalar(current: number, target: number, maxStep: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

function rotateTowardQuaternion(
  quat: THREE.Quaternion,
  target: THREE.Quaternion,
  maxRadians: number
): boolean {
  const remaining = quat.angleTo(target);
  if (remaining <= maxRadians) {
    quat.copy(target);
    return true;
  }
  quat.rotateTowards(target, maxRadians);
  return false;
}

type HoverDockingTransition = {
  dockEntryId: string;
  stationId: string | null;
  stage: 'align' | 'descend';
  /** Dock-local Y when capture began — undock returns to this height. */
  releaseLocalY: number;
};

type HoverUndockingTransition = {
  dockEntryId: string;
  targetY: number;
};

const EVENT_DOCKING_CAPTURE_STARTED = 'DockingCaptureStarted';
const EVENT_DOCKING_CAPTURE_ENDED = 'DockingCaptureEnded';

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
  const hoverDockingTransition = useRef<HoverDockingTransition | null>(null);
  const hoverUndockingTransition = useRef<HoverUndockingTransition | null>(null);
  const hoverDockReleaseLocalY = useRef<Map<string, number>>(new Map());
  const dockReentryBlock = useRef<string | null>(null);
  /** Ship docking port ignores capture until this performance.now() timestamp. */
  const dockingPortDisabledUntil = useRef(0);
  const undockHandlersRef = useRef<{
    tryBeginHoverUndock: (dockId: string) => boolean;
  }>({
    tryBeginHoverUndock: () => false,
  });

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
    undockHandlersRef,
    dockReentryBlock,
    dockingPortDisabledUntil,
  });

  undockHandlersRef.current.tryBeginHoverUndock = (dockId: string) => {
    if (hoverUndockingTransition.current || hoverDockingTransition.current) return true;
    const entry = getCollidables().find((c) => c.id === dockId);
    if (!entry) return false;
    const profile = getDockCaptureProfile(entry);
    if (profile.mode !== 'hover') return false;
    const dockObject = entry.getObject3D?.() ?? null;
    if (!dockObject || !groupRef.current) return false;
    if (groupRef.current.parent !== dockObject) {
      dockObject.attach(groupRef.current);
    }
    const releaseLocalY = hoverDockReleaseLocalY.current.get(dockId);
    const targetY =
      releaseLocalY ??
      profile.hoverReleaseLocalY ??
      groupRef.current.position.y;
    hoverUndockingTransition.current = {
      dockEntryId: dockId,
      targetY,
    };
    if (vesselId === PLAYER_VESSEL_ID) {
      clearAllDockPermissions();
      setDockPermissionCandidate(null);
    }
    dockReentryBlock.current = dockId;
    if (publishToPlayerRefs) {
      window.dispatchEvent(
        new CustomEvent(EVENT_DOCKING_CAPTURE_STARTED, {
          detail: { stationId: entry.stationId ?? null },
        })
      );
    }
    return true;
  };

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

  useEffect(() => {
    if (!physicsEnabled || !dockingPhysicsEnabled || !publishToPlayerRefs) return;

    const onDebugJumpDock = (event: Event) => {
      const stationId = (event as CustomEvent<{ stationId?: string | null }>).detail?.stationId;
      if (!stationId || !groupRef.current) return;

      const dockEntryId = `docking-bay-${stationId}`;
      const entry =
        getCollidables().find((c) => c.id === dockEntryId) ??
        getCollidables().find((c) => c.stationId === stationId);
      if (!entry) return;

      const profile = getDockCaptureProfile(entry);
      if (profile.mode !== 'hover') return;

      const dockObject = entry.getObject3D?.() ?? null;
      if (!dockObject) return;

      const group = groupRef.current;
      const wasDocked = dockedTo.current != null || group.parent !== scene;

      hoverDockingTransition.current = null;
      hoverUndockingTransition.current = null;
      dockReentryBlock.current = null;
      dockedTo.current = null;

      if (wasDocked) {
        detachShipFromDock(group, scene);
        window.dispatchEvent(new CustomEvent('ShipUndocked'));
      }

      dockObject.attach(group);
      group.position.set(0, DEBUG_JUMP_HOVER_LOCAL_Y, 0);
      group.quaternion.copy(LOCAL_DOCK_FORWARD_QUAT);
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      angularVelocity3.current.set(0, 0, 0);
      vesselState.shipVelocity.set(0, 0, 0);
      if (publishToPlayerRefs) {
        shipVelocity.set(0, 0, 0);
      }
      group.getWorldPosition(physicsPosition.current);
      syncShipWorldRefs(group, publishToPlayerRefs);

      hoverDockingTransition.current = {
        dockEntryId: entry.id,
        stationId: entry.stationId ?? stationId,
        stage: 'align',
        releaseLocalY: DEBUG_JUMP_HOVER_LOCAL_Y,
      };
      void playDockAlignSound();
      window.dispatchEvent(
        new CustomEvent(EVENT_DOCKING_CAPTURE_STARTED, {
          detail: { stationId: entry.stationId ?? stationId },
        })
      );
    };

    window.addEventListener(EVENT_DEBUG_JUMP_DOCK, onDebugJumpDock);
    return () => {
      window.removeEventListener(EVENT_DEBUG_JUMP_DOCK, onDebugJumpDock);
    };
  }, [
    dockingPhysicsEnabled,
    groupRef,
    physicsEnabled,
    physicsPosition,
    publishToPlayerRefs,
    scene,
    vesselState,
  ]);

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
      dockingTransitionActive: Boolean(
        hoverDockingTransition.current || hoverUndockingTransition.current
      ),
      dockReentryBlock,
      dockingPortDisabledUntil,
    });
  }, -1);

  // Priority 2: after BodyOrbit (0) — parent to dock and sync world refs for camera/HUD.
  useFrame((_, delta) => {
    try {
      if (!physicsEnabled) return;
      if (!groupRef.current) return;
      const group = groupRef.current;

      if (!dockingPhysicsEnabled) return;

      if (hoverUndockingTransition.current) {
        setDockPermissionCandidate(null);
        const transition = hoverUndockingTransition.current;
        const entry = getCollidables().find((c) => c.id === transition.dockEntryId);
        const dockObject = entry?.getObject3D?.() ?? null;

        if (!entry || !dockObject) {
          hoverUndockingTransition.current = null;
          if (publishToPlayerRefs) {
            window.dispatchEvent(
              new CustomEvent(EVENT_DOCKING_CAPTURE_ENDED, {
                detail: { stationId: entry?.stationId ?? null },
              })
            );
          }
        } else {
          if (group.parent !== dockObject) {
            dockObject.attach(group);
          }
          const nextY = moveTowardScalar(
            group.position.y,
            transition.targetY,
            LANDING_ASCEND_SPEED * delta
          );
          group.position.set(0, nextY, 0);
          if (nextY === transition.targetY) {
            group.position.set(0, transition.targetY, 0);
            hoverUndockingTransition.current = null;
            dockedTo.current = null;
            if (publishToPlayerRefs) {
              const stationId = entry.stationId ?? stationIdFromDockEntryId(transition.dockEntryId);
              if (stationId) revokeDockPermission(stationId);
              window.dispatchEvent(
                new CustomEvent(EVENT_DOCKING_CAPTURE_ENDED, {
                  detail: { stationId: entry.stationId ?? null },
                })
              );
              window.dispatchEvent(new CustomEvent('ShipUndocked'));
            }
            detachShipFromDock(group, scene);
            const releaseDir = computeUndockReleaseDirection(
              group,
              entry,
              _hoverUndockReleaseDir
            );
            group.position.addScaledVector(releaseDir, 1);
            const releaseSpeed = getDockCaptureProfile(entry).undockReleaseSpeed;
            velocity.current.copy(releaseDir.clone().multiplyScalar(releaseSpeed));
            dockReentryBlock.current = transition.dockEntryId;
            dockingPortDisabledUntil.current =
              performance.now() + SHIP_UNDOCK_DOCKING_COOLDOWN_MS;
            releaseParticleTrigger.current = true;
            group.getWorldPosition(physicsPosition.current);
          }
          group.getWorldPosition(physicsPosition.current);
          syncShipWorldRefs(group, publishToPlayerRefs);
          group.getWorldQuaternion(vesselState.shipQuaternion);
          return;
        }
      }

      if (hoverDockingTransition.current) {
        setDockPermissionCandidate(null);
        const transition = hoverDockingTransition.current;
        const entry = getCollidables().find((c) => c.id === transition.dockEntryId);
        const dockObject = entry?.getObject3D?.() ?? null;

        if (!entry || !dockObject) {
          if (publishToPlayerRefs) {
            window.dispatchEvent(
              new CustomEvent(EVENT_DOCKING_CAPTURE_ENDED, {
                detail: { stationId: transition.stationId },
              })
            );
          }
          hoverDockingTransition.current = null;
        } else {
          if (group.parent !== dockObject) {
            dockObject.attach(group);
          }
          const rotationAligned = rotateTowardQuaternion(
            group.quaternion,
            LOCAL_DOCK_FORWARD_QUAT,
            LANDING_ROTATE_SPEED * delta
          );
          if (transition.stage === 'align') {
            const nextX = moveTowardScalar(group.position.x, 0, LANDING_ALIGN_SPEED * delta);
            const nextZ = moveTowardScalar(group.position.z, 0, LANDING_ALIGN_SPEED * delta);
            group.position.set(nextX, group.position.y, nextZ);
            if (
              nextX === 0 &&
              nextZ === 0 &&
              rotationAligned &&
              isLandingPadElevatorReady(transition.stationId)
            ) {
              group.position.set(0, group.position.y, 0);
              transition.stage = 'descend';
            }
          } else {
            const nextY = moveTowardScalar(group.position.y, 0, LANDING_DESCEND_SPEED * delta);
            group.position.set(0, nextY, 0);
            if (nextY === 0) {
              group.quaternion.copy(LOCAL_DOCK_FORWARD_QUAT);
              hoverDockReleaseLocalY.current.set(transition.dockEntryId, transition.releaseLocalY);
              dockedTo.current = transition.dockEntryId;
              if (publishToPlayerRefs) {
                window.dispatchEvent(
                new CustomEvent(EVENT_DOCKING_CAPTURE_ENDED, {
                  detail: { stationId: transition.stationId },
                })
              );
              window.dispatchEvent(
                new CustomEvent('ShipDocked', { detail: { stationId: transition.stationId } })
              );
              }
              hoverDockingTransition.current = null;
            }
          }
          group.getWorldPosition(physicsPosition.current);
          syncShipWorldRefs(group, publishToPlayerRefs);
          group.getWorldQuaternion(vesselState.shipQuaternion);
          return;
        }
      }

      if (dockedTo.current) {
        setDockPermissionCandidate(null);
        const entry = getCollidables().find((c) => c.id === dockedTo.current);
        if (entry && !disablesShipPhysicsWhenDocked(getDockCaptureProfile(entry))) {
          // Towable dock: keep ship on the scene root; partner follows the ship port.
          if (group.parent !== scene) {
            detachShipFromDock(group, scene);
          }
          group.getWorldPosition(physicsPosition.current);
          syncShipWorldRefs(group, publishToPlayerRefs);
          group.getWorldQuaternion(vesselState.shipQuaternion);
          return;
        }
        if (entry) {
          attachShipToDock(group, entry);
        }
        group.getWorldPosition(physicsPosition.current);
        syncShipWorldRefs(group, publishToPlayerRefs);
        group.getWorldQuaternion(vesselState.shipQuaternion);
        return;
      }

      if (neptuneNoFlyZoneActive.current) {
        setDockPermissionCandidate(null);
        return;
      }

      const nearestHoverCandidate = findNearestHoverDockCandidate(
        group,
        selfCollisionId ?? vesselId,
        dockReentryBlock.current
      );
      if (nearestHoverCandidate && nearestHoverCandidate.stationId) {
        const dockLabel =
          getDock(nearestHoverCandidate.stationId)?.label ?? nearestHoverCandidate.stationId;
        setDockPermissionCandidate({
          stationId: nearestHoverCandidate.stationId,
          dockEntryId: nearestHoverCandidate.id,
          label: dockLabel,
        });
      } else {
        setDockPermissionCandidate(null);
      }

      if (dockReentryBlock.current) {
        const blockedEntry = getCollidables().find((c) => c.id === dockReentryBlock.current);
        if (
          !blockedEntry ||
          !isShipWithinDockCaptureRange(group, blockedEntry, dockingPortRef.current)
        ) {
          dockReentryBlock.current = null;
        }
      }

      checkDockingPort({
        group,
        dockingPort: dockingPortRef.current,
        dockedTo,
        velocity: velocity.current,
        selfCollisionId: selfCollisionId ?? vesselId,
        emitDockingEvents: publishToPlayerRefs,
        dockReentryBlock,
        dockingPortDisabledUntil,
        onBeforeDock: ({ bayEntry, captureMode }) => {
          if (captureMode !== 'hover') return false;
          const stationId = bayEntry.stationId ?? null;
          if (!hasDockPermission(stationId)) {
            return 'block';
          }
          const dockObject = bayEntry.getObject3D?.() ?? null;
          if (!dockObject) return false;
          if (!hoverDockingTransition.current) {
            dockObject.attach(group);
            hoverDockingTransition.current = {
              dockEntryId: bayEntry.id,
              stationId: bayEntry.stationId ?? null,
              stage: 'align',
              releaseLocalY: group.position.y,
            };
            if (publishToPlayerRefs) {
              void playDockAlignSound();
              window.dispatchEvent(
                new CustomEvent(EVENT_DOCKING_CAPTURE_STARTED, {
                  detail: { stationId: bayEntry.stationId ?? null },
                })
              );
            }
          }
          return true;
        },
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

function findNearestHoverDockCandidate(
  group: THREE.Group,
  selfCollisionId: string,
  dockReentryBlockId: string | null
): { id: string; stationId: string | null } | null {
  group.getWorldPosition(_candidateShipPos);
  let bestEntry: { id: string; stationId: string | null } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const entry of getCollidables()) {
    if (entry.id === selfCollisionId) continue;
    if (entry.shape.type !== 'box') continue;
    if (!entry.id.startsWith('docking-bay')) continue;
    if (dockReentryBlockId === entry.id) continue;
    const dockingProfile = getDockCaptureProfile(entry);
    if (dockingProfile.mode !== 'hover') continue;
    const dockObject = entry.getObject3D?.() ?? null;
    if (!dockObject) continue;
    if (group.parent === dockObject || dockObject.parent === group) {
      continue;
    }
    entry.getWorldPosition(_candidateDockPos);
    const planarDistance = Math.hypot(
      _candidateShipPos.x - _candidateDockPos.x,
      _candidateShipPos.z - _candidateDockPos.z
    );
    const promptRadius = Math.max(dockingProfile.captureRadius, MIN_DOCK_PERMISSION_PROMPT_RADIUS);
    if (planarDistance >= promptRadius) continue;
    if (planarDistance < bestDist) {
      bestDist = planarDistance;
      bestEntry = { id: entry.id, stationId: entry.stationId ?? null };
    }
  }

  return bestEntry;
}
