import * as THREE from 'three';
import type { RefObject } from 'react';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../../context/ShipState';
import { FUEL_REFILL_RATE, O2_REFILL_RATE, o2DrainRateForCrew } from '../../config/damageConfig';
import { resourceRateRefs } from '../../context/ResourceRates';
import { zeroThrusterLights } from './thrusterLight';
import { autopilotActive, disableAutopilot } from '../../context/AutopilotState';
import {
  dockLocalOffsetToWorldPose,
  getDockCaptureProfile,
  pointDistanceToDockBox,
  shipLocalOffsetToWorld,
} from '../../utils/dockingCapture';
import { disablesShipPhysicsWhenDocked } from '../../config/dockCaptureConfig';
import {
  setVesselFuel,
  setVesselO2,
  type VesselRuntimeState,
} from '../../context/VesselStateStore';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { setFuel, setO2 } from '../../context/ShipState';
import { playDockConnectSound } from '../../sound/SoundManager';

const _portWorldPos = new THREE.Vector3();
const _dockVel = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _desiredDockPos = new THREE.Vector3();
const _desiredDockQuat = new THREE.Quaternion();
const _shipWorldPos = new THREE.Vector3();
const _dockWorldPos = new THREE.Vector3();
const _clampWorldPos = new THREE.Vector3();
const _clampWorldQuat = new THREE.Quaternion();
const _clampParentWorldQuat = new THREE.Quaternion();

function isInHierarchy(root: THREE.Object3D, candidate: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = candidate;
  while (node) {
    if (node === root) return true;
    node = node.parent;
  }
  return false;
}

/** True when the ship satisfies the same capture overlap test used by `checkDockingPort`. */
export function isShipWithinDockCaptureRange(
  group: THREE.Group,
  dockEntry: CollidableEntry,
  dockingPort: THREE.Group | null
): boolean {
  const bayObject = dockEntry.getObject3D?.() ?? null;
  if (bayObject && (isInHierarchy(group, bayObject) || isInHierarchy(bayObject, group))) {
    return false;
  }
  const dockingProfile = getDockCaptureProfile(dockEntry);
  if (dockingProfile.mode === 'nose') {
    if (!dockingPort) return false;
    dockingPort.getWorldPosition(_portWorldPos);
    return pointDistanceToDockBox(_portWorldPos, dockEntry) < dockingProfile.captureRadius;
  }
  if (dockingProfile.mode === 'hover') {
    group.getWorldPosition(_shipWorldPos);
    dockEntry.getWorldPosition(_dockWorldPos);
    const dx = _shipWorldPos.x - _dockWorldPos.x;
    const dz = _shipWorldPos.z - _dockWorldPos.z;
    return Math.hypot(dx, dz) < dockingProfile.captureRadius;
  }
  if (dockingProfile.mode === 'clamp') {
    group.getWorldPosition(_shipWorldPos);
    dockEntry.getWorldPosition(_dockWorldPos);
    const radius =
      dockEntry.shape.type === 'sphere' ? dockEntry.shape.radius : dockingProfile.captureRadius;
    // Still "in range" while overlapping the asteroid body (post-undock re-entry guard).
    return _shipWorldPos.distanceTo(_dockWorldPos) < radius + 8;
  }
  shipLocalOffsetToWorld(group, dockingProfile.probeLocalOffset, _portWorldPos);
  return pointDistanceToDockBox(_portWorldPos, dockEntry) < dockingProfile.captureRadius;
}

/** Compute the world pose that aligns the ship nose with a docking bay. */
function computeDockedWorldPose(dockerEntry: CollidableEntry): {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
} {
  const profile = getDockCaptureProfile(dockerEntry);
  return dockLocalOffsetToWorldPose(
    dockerEntry,
    profile.attachOffsetLocal,
    _desiredDockPos,
    _desiredDockQuat
  );
}

/**
 * Parent the ship to the docking bay so orbital motion is inherited from the
 * scene graph (no per-frame world-coordinate resync / lerp).
 *
 * Nose docks: ship root is offset by `attachOffsetLocal` so the ship's docking
 * port sits on the bay origin (port-to-port), not the ship center on the bay.
 */
export function attachShipToDock(group: THREE.Group, dockerEntry: CollidableEntry): void {
  const dockObject = dockerEntry.getObject3D?.() ?? null;
  const profile = getDockCaptureProfile(dockerEntry);

  // Clamp docks: lock impact XZ on the asteroid, but keep the ship on the
  // gameplay plane (world Y = 0). Rotation is preserved from the impact pose.
  if (profile.mode === 'clamp') {
    if (!dockObject) return;

    group.updateWorldMatrix(true, false);
    group.getWorldPosition(_clampWorldPos);
    group.getWorldQuaternion(_clampWorldQuat);
    _clampWorldPos.y = 0;

    if (group.parent !== dockObject) {
      dockObject.attach(group);
    }

    dockObject.updateWorldMatrix(true, false);
    dockObject.getWorldQuaternion(_clampParentWorldQuat);
    group.position.copy(_clampWorldPos);
    dockObject.worldToLocal(group.position);
    group.quaternion.copy(_clampParentWorldQuat).invert().multiply(_clampWorldQuat);
    return;
  }

  const { position, quaternion } = computeDockedWorldPose(dockerEntry);

  if (dockObject) {
    if (group.parent !== dockObject) {
      // Set world pose while still on the scene root, then reparent (preserves world transform).
      group.position.copy(position);
      group.quaternion.copy(quaternion);
      dockObject.attach(group);
    }
    // Nose docks: keep port-to-port alignment in dock-local space every frame.
    // Hover docks manage their own local pose (align/descend to pad center).
    if (profile.mode === 'nose') {
      group.position.set(
        profile.attachOffsetLocal[0],
        profile.attachOffsetLocal[1],
        profile.attachOffsetLocal[2]
      );
      group.quaternion.identity();
    }
    return;
  }

  // Static dock with no render object — hard snap in world space.
  group.position.copy(position);
  group.quaternion.copy(quaternion);
}

/** Restore the ship to the scene root when undocking, preserving world transform. */
export function detachShipFromDock(group: THREE.Group, scene: THREE.Object3D): void {
  if (!group.parent || group.parent === scene) return;
  scene.attach(group);
}

/**
 * World-space direction that pushes the ship *away* from the dock partner.
 * Uses dock→ship on the XZ plane so towable / yaw-mismatched partners never
 * get a ship-local axis that points into the object.
 */
export function computeUndockReleaseDirection(
  group: THREE.Group,
  dockEntry: CollidableEntry | undefined,
  out: THREE.Vector3
): THREE.Vector3 {
  group.getWorldPosition(_shipWorldPos);

  if (dockEntry) {
    dockEntry.getWorldPosition(_dockWorldPos);
    out.set(_shipWorldPos.x - _dockWorldPos.x, 0, _shipWorldPos.z - _dockWorldPos.z);
    if (out.lengthSq() > 1e-6) {
      return out.normalize();
    }
  }

  // Fallback: ship-local +Z is opposite the nose docking port (-Z).
  out.set(0, 0, 1).applyQuaternion(group.quaternion).setY(0);
  if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
  return out.normalize();
}

/** Detail payload on `ShipUndocked` for towable dock partners. */
export type ShipUndockedDetail = {
  dockEntryId: string | null;
  /**
   * Absolute world-space velocity the towable partner should take on release
   * (shared tow velocity minus the same undock impulse the ship received).
   */
  partnerReleaseVelocity?: { x: number; y: number; z: number };
};

interface DockedResourcesParams {
  vesselId: string;
  vesselState: VesselRuntimeState;
  trackHudRates?: boolean;
  thrusterLightRefs: RefObject<(THREE.PointLight | null)[]>;
  thrusterLightIntensities: { current: number[] };
  rawDelta: number;
}

/** Fuel/O2/thruster state while docked — no transform updates here. */
export function applyDockedResources({
  vesselId,
  vesselState,
  trackHudRates = true,
  thrusterLightRefs,
  thrusterLightIntensities,
  rawDelta,
}: DockedResourcesParams): void {
  vesselState.shipVelocity.set(0, 0, 0);
  vesselState.shipAcceleration.current = 0;
  zeroThrusterLights(thrusterLightIntensities, thrusterLightRefs);

  const o2Drain = o2DrainRateForCrew(vesselState.shipCrew);

  let fuelRate = 0;
  let o2Rate = -o2Drain;
  if (vesselState.isRefueling.current) {
    fuelRate += FUEL_REFILL_RATE;
    const nextFuel = Math.min(100, vesselState.fuel + FUEL_REFILL_RATE * rawDelta);
    if (vesselId === PLAYER_VESSEL_ID) {
      setFuel(nextFuel);
    } else {
      setVesselFuel(vesselId, nextFuel);
    }
  }
  if (vesselState.isTransferringO2.current) {
    o2Rate += O2_REFILL_RATE;
    const nextO2 = Math.min(100, vesselState.o2 + O2_REFILL_RATE * rawDelta);
    if (vesselId === PLAYER_VESSEL_ID) {
      setO2(nextO2);
    } else {
      setVesselO2(vesselId, nextO2);
    }
  }
  const drainedO2 = Math.max(0, vesselState.o2 - o2Drain * rawDelta);
  if (vesselId === PLAYER_VESSEL_ID) {
    setO2(drainedO2);
  } else {
    setVesselO2(vesselId, drainedO2);
  }

  if (trackHudRates) {
    resourceRateRefs.power.current = 0;
    resourceRateRefs.fuel.current = fuelRate;
    resourceRateRefs.o2.current = o2Rate;
  }
}

interface DockingPortParams {
  group: THREE.Group;
  dockingPort: THREE.Group | null;
  dockedTo: { current: string | null };
  velocity: THREE.Vector3;
  selfCollisionId?: string;
  emitDockingEvents?: boolean;
  /** Bay id to ignore until the ship leaves that dock's capture range (post-undock re-entry guard). */
  dockReentryBlock?: { current: string | null };
  /** performance.now() timestamp — ship's docking port is disabled until this time. */
  dockingPortDisabledUntil?: { current: number };
  onBeforeDock?: (params: {
    bayEntry: CollidableEntry;
    dockingProfile: ReturnType<typeof getDockCaptureProfile>;
    captureMode: 'nose' | 'hover';
    relSpeed: number;
  }) => boolean | 'block';
}

export function checkDockingPort({
  group,
  dockingPort,
  dockedTo,
  velocity,
  selfCollisionId = SHIP_COLLISION_ID,
  emitDockingEvents = true,
  dockReentryBlock,
  dockingPortDisabledUntil,
  onBeforeDock,
}: DockingPortParams) {
  if (dockedTo.current || !dockingPort) return;
  if (dockingPortDisabledUntil && performance.now() < dockingPortDisabledUntil.current) return;

  let capturedProfileMode: 'nose' | 'hover' | null = null;
  const bayEntry = getCollidables().find((c) => {
    if (c.id === selfCollisionId) return false;
    if (c.shape.type !== 'box') return false;
    if (!c.id.startsWith('docking-bay')) return false;
    if (dockReentryBlock?.current === c.id) return false;
    const bayObject = c.getObject3D?.() ?? null;
    if (bayObject && (isInHierarchy(group, bayObject) || isInHierarchy(bayObject, group))) {
      return false;
    }
    const dockingProfile = getDockCaptureProfile(c);
    if (dockingProfile.mode === 'clamp') return false;
    if (dockingProfile.mode === 'nose') {
      dockingPort.getWorldPosition(_portWorldPos);
      const isCaptured = pointDistanceToDockBox(_portWorldPos, c) < dockingProfile.captureRadius;
      if (isCaptured) capturedProfileMode = dockingProfile.mode;
      return isCaptured;
    }
    if (dockingProfile.mode === 'hover') {
      // Hover/landing docking uses ship-center planar distance to lock X/Z to pad center.
      group.getWorldPosition(_shipWorldPos);
      c.getWorldPosition(_dockWorldPos);
      const dx = _shipWorldPos.x - _dockWorldPos.x;
      const dz = _shipWorldPos.z - _dockWorldPos.z;
      const isCaptured = Math.hypot(dx, dz) < dockingProfile.captureRadius;
      if (isCaptured) capturedProfileMode = dockingProfile.mode;
      return isCaptured;
    }
    {
      shipLocalOffsetToWorld(group, dockingProfile.probeLocalOffset, _portWorldPos);
      const isCaptured = pointDistanceToDockBox(_portWorldPos, c) < dockingProfile.captureRadius;
      if (isCaptured) capturedProfileMode = 'nose';
      return isCaptured;
    }
  });

  if (!bayEntry) return;
  const dockingProfile = getDockCaptureProfile(bayEntry);
  const bayVel = bayEntry.getWorldVelocity
    ? bayEntry.getWorldVelocity(_dockVel)
    : _dockVel.set(0, 0, 0);
  const relSpeed = _relVel.subVectors(velocity, bayVel).length();
  if (relSpeed >= dockingProfile.maxRelativeSpeed) return;

  if (emitDockingEvents && autopilotActive.current) {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  }

  const captureMode: 'nose' | 'hover' = capturedProfileMode ?? (dockingProfile.mode === 'hover' ? 'hover' : 'nose');
  const beforeDockResult = onBeforeDock?.({
    bayEntry,
    dockingProfile,
    captureMode,
    relSpeed,
  });
  if (beforeDockResult === 'block') {
    return;
  }
  if (beforeDockResult) {
    velocity.set(0, 0, 0);
    return;
  }

  dockedTo.current = bayEntry.id;
  if (emitDockingEvents) {
    // Front/nose bay latch — container, ship, or station hardpoints.
    if (captureMode === 'nose') {
      playDockConnectSound();
    }
    window.dispatchEvent(
      new CustomEvent('ShipDocked', { detail: { stationId: bayEntry.stationId ?? null } })
    );
  }
  // Towable docks (e.g. cargo): keep ship free — partner follows the ship port.
  if (!disablesShipPhysicsWhenDocked(dockingProfile)) {
    return;
  }
  velocity.set(0, 0, 0);
  attachShipToDock(group, bayEntry);
}
