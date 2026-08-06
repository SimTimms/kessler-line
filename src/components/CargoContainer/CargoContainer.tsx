import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { selectTarget } from '../../context/TargetSelection';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import {
  registerCargoContainer,
  unregisterCargoContainer,
  consumeSavedContainerPosition,
} from '../../context/CargoContainerRegistry';
import DockingBay from '../WorldObjects/DockingBay';
import { boxColliderFromObject } from '../../utils/colliderFromObject';
import type { DockConfig } from '../../config/dockConfig';
import type { DockCaptureProfile } from '../../config/dockCaptureConfig';
import {
  CARGO_CONTAINER_DOCK_CAPTURE_PROFILE,
  DOCK_ATTACH_PORT_GAP,
} from '../../config/dockCaptureConfig';
import { CARGO_CONTAINER_DOCK } from '../../config/docks/cargoContainerDockConfig';
import {
  CARGO_CONTAINER_PORT_DIMENSIONS,
  CARGO_CONTAINER_PORT_LOCAL_OFFSET,
  CONTAINER_IMPULSE_SCALE,
  CONTAINER_VELOCITY_DAMPING,
} from '../../config/containerConfig';
import { SHIP_DOCKING_PORT_LOCAL } from '../../config/shipConfig';
import { shipPosRef } from '../../context/ShipPos';
import { shipQuaternion, shipVelocity } from '../../context/ShipState';
import {
  renderToSimulationSpace,
  simulationToRenderSpace,
} from '../../context/FloatingOrigin';
import type { ShipUndockedDetail } from '../../hooks/shipPhysics/docking';

const DEFAULT_URL = '/container.glb';
const DEFAULT_ID = 'cargo-container';

const _shipPortWorld = new THREE.Vector3();
const _portLocal = new THREE.Vector3();
const _noseDir = new THREE.Vector3();
const _euler = new THREE.Euler();
const _renderPos = new THREE.Vector3();
const _localPos = new THREE.Vector3();

/** Write simulation-space posRef onto the group, respecting parent + floating origin. */
function applySimPositionToGroup(group: THREE.Group, simPos: THREE.Vector3): void {
  simulationToRenderSpace(simPos, _renderPos);
  if (group.parent) {
    group.parent.worldToLocal(_localPos.copy(_renderPos));
    group.position.copy(_localPos);
  } else {
    group.position.copy(_renderPos);
  }
}

/** Read the group's simulation-space world position into target. */
function readGroupSimPosition(group: THREE.Group, target: THREE.Vector3): void {
  group.getWorldPosition(_renderPos);
  renderToSimulationSpace(_renderPos, target);
}

export interface CargoContainerProps {
  /** Unique dock id — required when multiple containers share a scene. */
  id?: string;
  label?: string;
  url?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /**
   * Full dock configuration (fuel / O2 / power / crew / inventory / contacts).
   * Defaults to {@link CARGO_CONTAINER_DOCK}.
   */
  dock?: DockConfig;
  dockingProfile?: DockCaptureProfile;
  /**
   * When true, docking freezes the ship (station-style).
   * When false (default), the ship keeps physics and tows this container.
   */
  disablePhysicsOnDock?: boolean;
  /** Local offset of the docking port from the crate origin. */
  portLocalOffset?: [number, number, number];
  /** Full-size docking-port capture box dimensions. */
  portDimensions?: [number, number, number];
  showCaptureMesh?: boolean;
  /** Initial world-space drift velocity (XZ plane) applied on spawn. */
  initialVelocity?: [number, number, number];
}

export default function CargoContainer({
  id = DEFAULT_ID,
  label,
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  dock = CARGO_CONTAINER_DOCK,
  dockingProfile = CARGO_CONTAINER_DOCK_CAPTURE_PROFILE,
  disablePhysicsOnDock = false,
  portLocalOffset = CARGO_CONTAINER_PORT_LOCAL_OFFSET,
  portDimensions = CARGO_CONTAINER_PORT_DIMENSIONS,
  showCaptureMesh = true,
  initialVelocity = [0, 0, 0],
}: CargoContainerProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  // Clone so each instance is independent (shared GLTF cache is not mutated).
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null!);
  const structureCollisionId = `${id}-structure`;
  const displayLabel = label ?? dock.label ?? 'Cargo Container';

  // Crates always slide on the XZ plane (Y locked to 0) unless on a drop-off pad.
  // posRef is simulation-space world position (not parent-local).
  const posRef = useRef(new THREE.Vector3(position[0], 0, position[2]));
  const velRef = useRef(new THREE.Vector3());
  const quatRef = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation[1], 0)));
  /** True while the player ship is towing this container. */
  const towedRef = useRef(false);
  /** True while a salvage intake pad owns positioning. */
  const dropOffRef = useRef(false);
  /** True after intake finished — crate is hidden. */
  const consumedRef = useRef(false);
  const [consumed, setConsumed] = useState(false);

  /** True when the docking bay should be mounted (ship within range or nav target). */
  const dockingBayActiveRef = useRef(false);
  const [dockingBayActive, setDockingBayActive] = useState(false);

  const resolvedProfile = useMemo(
    () => ({
      ...dockingProfile,
      disablePhysicsOnDock,
    }),
    [dockingProfile, disablePhysicsOnDock]
  );

  const { halfExtents, meshOffset } = useMemo(
    () => boxColliderFromObject(gltf.scene, scale),
    [gltf.scene, scale]
  );

  // Port box scales with the crate so the white mesh stays visible on the face.
  const portBox = useMemo(
    () =>
      new THREE.Vector3(
        portDimensions[0] * scale,
        portDimensions[1] * scale,
        portDimensions[2] * scale
      ),
    [portDimensions, scale]
  );

  // Sit the port on the crate's +Z face (X/Y from config, Z from hull bounds).
  const portLocal = useMemo(
    () =>
      new THREE.Vector3(
        portLocalOffset[0] * scale,
        portLocalOffset[1] * scale,
        halfExtents.z + portBox.z * 0.5
      ),
    [halfExtents.z, portBox.z, portLocalOffset, scale]
  );

  const setGroupRef = useCallback((el: THREE.Group | null) => {
    groupRef.current = el!;
  }, []);

  // Props are parent-local (e.g. SalvageField origin). Resolve to sim-world once mounted.
  // If a saved sim-space position exists (from a loaded save), use it instead.
  useLayoutEffect(() => {
    const group = groupRef.current;
    const savedPos = consumeSavedContainerPosition(id);

    if (savedPos) {
      // Restore from save — savedPos is already sim-space.
      posRef.current.set(savedPos[0], savedPos[1], savedPos[2]);
      if (group) {
        applySimPositionToGroup(group, posRef.current);
      }
    } else if (!group) {
      posRef.current.set(position[0], 0, position[2]);
    } else {
      group.position.set(position[0], 0, position[2]);
      group.updateWorldMatrix(true, false);
      readGroupSimPosition(group, posRef.current);
      posRef.current.y = 0;
    }
    quatRef.current.setFromEuler(new THREE.Euler(0, rotation[1], 0));
    if (savedPos) {
      velRef.current.set(0, 0, 0);
    } else {
      velRef.current.set(initialVelocity[0], 0, initialVelocity[2]);
    }
    if (group) {
      group.quaternion.copy(quatRef.current);
    }
  }, [id, initialVelocity, position, rotation]);

  const registerStructureCollider = useCallback(
    (physicalCollision: boolean) => {
      registerCollidable({
        id: structureCollisionId,
        label: displayLabel,
        getWorldPosition: (target) => target.copy(posRef.current),
        getWorldQuaternion: (target) => target.copy(quatRef.current),
        getWorldVelocity: (target) => target.copy(velRef.current),
        shape: { type: 'box', halfExtents: halfExtents.clone() },
        physicalCollision,
        applyImpulse: (impulse: THREE.Vector3) => {
          if (towedRef.current || dropOffRef.current || consumedRef.current) return;
          velRef.current.addScaledVector(impulse, CONTAINER_IMPULSE_SCALE);
          // Never leave the XZ plane.
          velRef.current.y = 0;
        },
        getObject3D: () => groupRef.current,
      });
    },
    [displayLabel, halfExtents, structureCollisionId]
  );

  useEffect(() => {
    registerStructureCollider(true);
    return () => {
      unregisterCollidable(structureCollisionId);
    };
  }, [registerStructureCollider, structureCollisionId]);

  useEffect(() => {
    const onDocked = (e: Event) => {
      const stationId = (e as CustomEvent<{ stationId?: string | null }>).detail?.stationId;
      if (stationId !== id) return;
      if (dropOffRef.current || consumedRef.current) return;
      towedRef.current = !disablePhysicsOnDock;
      velRef.current.set(0, 0, 0);
      // Avoid ship↔crate collision fighting while towing.
      if (towedRef.current) registerStructureCollider(false);
    };
    const onUndocked = (e: Event) => {
      if (!towedRef.current) return;
      towedRef.current = false;
      if (dropOffRef.current || consumedRef.current) return;
      const releaseVel = (e as CustomEvent<ShipUndockedDetail>).detail?.partnerReleaseVelocity;
      if (releaseVel) {
        velRef.current.set(releaseVel.x, 0, releaseVel.z);
      } else {
        velRef.current.set(shipVelocity.x, 0, shipVelocity.z);
      }
      registerStructureCollider(true);
    };
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
  }, [disablePhysicsOnDock, id, registerStructureCollider]);

  useEffect(() => {
    registerCargoContainer({
      id,
      getWorldPosition: (target) => target.copy(posRef.current),
      getWorldVelocity: (target) => target.copy(velRef.current),
      getGroup: () => groupRef.current,
      isTowed: () => towedRef.current,
      isDropOffBusy: () => dropOffRef.current,
      isConsumed: () => consumedRef.current,
      getSimPosition: () => posRef.current,
      setDockingBayProximity: (active: boolean) => {
        if (active !== dockingBayActiveRef.current) {
          dockingBayActiveRef.current = active;
          setDockingBayActive(active);
        }
      },
      beginDropOff: (padAnchor) => {
        if (towedRef.current || dropOffRef.current || consumedRef.current) return false;
        const group = groupRef.current;
        if (!group) return false;
        dropOffRef.current = true;
        towedRef.current = false;
        velRef.current.set(0, 0, 0);
        unregisterCollidable(structureCollisionId);
        padAnchor.attach(group);
        return true;
      },
      syncFromGroup: () => {
        const group = groupRef.current;
        if (!group) return;
        readGroupSimPosition(group, posRef.current);
        group.getWorldQuaternion(quatRef.current);
        velRef.current.set(0, 0, 0);
      },
      completeDropOff: () => {
        dropOffRef.current = false;
        consumedRef.current = true;
        velRef.current.set(0, 0, 0);
        const group = groupRef.current;
        if (group) {
          group.visible = false;
        }
        unregisterCollidable(structureCollisionId);
        setConsumed(true);
      },
    });
    return () => unregisterCargoContainer(id);
  }, [id, structureCollisionId]);

  useFrame((_, delta) => {
    if (!groupRef.current || consumedRef.current) return;

    if (dropOffRef.current) {
      // Pad owns local transform; keep world refs in sync for sensors.
      readGroupSimPosition(groupRef.current, posRef.current);
      groupRef.current.getWorldQuaternion(quatRef.current);
      return;
    }

    // Track whether position/rotation actually changed this frame so we can skip
    // the worldToLocal write for the 30+ stationary containers in the narrative scene.
    const wasMoving = towedRef.current || velRef.current.lengthSq() > 1e-8;

    if (towedRef.current) {
      // Align container docking port with the ship nose port, then push it a little
      // further along the nose so ports keep a small gap while attached.
      _shipPortWorld
        .set(SHIP_DOCKING_PORT_LOCAL[0], SHIP_DOCKING_PORT_LOCAL[1], SHIP_DOCKING_PORT_LOCAL[2])
        .applyQuaternion(shipQuaternion)
        .add(shipPosRef.current);

      _euler.setFromQuaternion(shipQuaternion, 'YXZ');
      quatRef.current.setFromEuler(_euler.set(0, _euler.y, 0));

      // Ship nose / dock axis is local -Z.
      _noseDir.set(0, 0, -1).applyQuaternion(quatRef.current);
      _shipPortWorld.addScaledVector(_noseDir, DOCK_ATTACH_PORT_GAP);

      _portLocal.copy(portLocal).applyQuaternion(quatRef.current);
      posRef.current.copy(_shipPortWorld).sub(_portLocal);
      posRef.current.y = 0;
      velRef.current.set(shipVelocity.x, 0, shipVelocity.z);
    } else if (velRef.current.lengthSq() > 1e-8) {
      posRef.current.addScaledVector(velRef.current, delta);
      velRef.current.multiplyScalar(Math.pow(CONTAINER_VELOCITY_DAMPING, delta));
      posRef.current.y = 0;
      velRef.current.y = 0;
    }

    // Only write back to the scene graph when position/orientation changed.
    // Stationary containers (up to 32 in the narrative scene) were calling
    // worldToLocal + quaternion copy every frame for no reason.
    if (wasMoving) {
      applySimPositionToGroup(groupRef.current, posRef.current);
      groupRef.current.quaternion.copy(quatRef.current);
    }
    // Proximity check moved to CargoContainerProximityManager (one shared useFrame
    // for all containers instead of N individual per-container subscriptions).
  });

  return (
    <group
      ref={setGroupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (consumedRef.current) return;
        selectTarget(displayLabel);
      }}
    >
      <group position={[meshOffset.x, meshOffset.y, meshOffset.z]}>
        <primitive object={modelScene} scale={scale} />
      </group>
      {/* Dedicated docking port — not the physical hull. Only mounted when nearby or nav target. */}
      {!consumed && dockingBayActive ? (
        <DockingBay
          stationId={id}
          dimensions={portBox}
          position={portLocal}
          rotation={[0, 0, 0]}
          dock={dock}
          dockingProfile={resolvedProfile}
          showCaptureMesh={showCaptureMesh}
        />
      ) : null}
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
