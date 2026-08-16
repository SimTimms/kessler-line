import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import PowerSource from './PowerSource';
import { selectTarget } from '../../context/TargetSelection';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { listCargoContainers } from '../../context/CargoContainerRegistry';
import { useRegisterDock } from '../../hooks/useRegisterDockablePartner';
import { useRegisterRadioBroadcast } from '../../hooks/useRegisterRadioBroadcast';
import { transferAllInventory } from '../../context/InventoryStore';
import { setIncomingHail } from '../../context/IncomingHailState';
import type { DockConfig } from '../../config/dockConfig';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { PLAYER_SALVAGED_BY } from '../../config/inventoryTypes';
import {
  EVENT_CARGO_DROPOFF_COMPLETED,
  EVENT_CARGO_DROPOFF_STARTED,
  SALVAGE_DROPOFF_ALIGN_SPEED,
  SALVAGE_DROPOFF_CAPTURE_RADIUS,
  SALVAGE_DROPOFF_DESCEND_SPEED,
  SALVAGE_DROPOFF_HAIL_TREE_ID,
  SALVAGE_DROPOFF_MAX_SPEED,
  SALVAGE_DROPOFF_PAD_ID,
  SALVAGE_DROPOFF_PAD_LABEL,
  SALVAGE_DROPOFF_RADIO_ID,
  SALVAGE_DROPOFF_REST_LOCAL_Y,
  SALVAGE_DROPOFF_ROTATE_SPEED,
  SALVAGE_DROPOFF_SCAN_ACTIVATION_RANGE,
  type CargoDropOffCompletedDetail,
  type CargoDropOffStartedDetail,
} from '../../config/salvageDropOffConfig';
import { shipPosRef } from '../../context/ShipPos';

const LOCAL_PAD_FORWARD_QUAT = new THREE.Quaternion();
const SALVAGE_DROPOFF_SCAN_ACTIVATION_RANGE_SQ =
  SALVAGE_DROPOFF_SCAN_ACTIVATION_RANGE * SALVAGE_DROPOFF_SCAN_ACTIVATION_RANGE;

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

type DropOffTransition = {
  cargoId: string;
  stage: 'align' | 'descend';
};

const _cratePos = new THREE.Vector3();
const _crateVel = new THREE.Vector3();
const _padPos = new THREE.Vector3();

interface SalvageDropOffPadProps {
  id?: string;
  label?: string;
  scale?: number;
  dock?: DockConfig;
  captureRadius?: number;
  maxCaptureSpeed?: number;
  radioBroadcast?: RadioBroadcastDef;
}

/**
 * Crate-only intake pad. Ships cannot dock here. When a free (untowed) cargo
 * container drifts into range slowly enough, the pad parents it, aligns/descends
 * it like a hover landing, dumps inventory into the shared salvage depot, then
 * hails the player.
 */
export default function SalvageDropOffPad({
  id = SALVAGE_DROPOFF_PAD_ID,
  label = SALVAGE_DROPOFF_PAD_LABEL,
  scale = 1,
  dock,
  captureRadius = SALVAGE_DROPOFF_CAPTURE_RADIUS,
  maxCaptureSpeed = SALVAGE_DROPOFF_MAX_SPEED,
  radioBroadcast,
}: SalvageDropOffPadProps) {
  const gltf = useGLTF('/salvage-bay.glb') as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null!);
  const anchorRef = useRef<THREE.Group>(null!);
  const structureCollisionId = `${id}`;
  const transitionRef = useRef<DropOffTransition | null>(null);
  const inventoryOwnerId = dock ? (dock.inventoryOwnerId ?? id) : id;

  // Passive beacon only — no hailRange. Delivery dialogue fires once after intake completes.
  const resolvedRadio = useMemo<RadioBroadcastDef>(
    () =>
      radioBroadcast ?? {
        id: SALVAGE_DROPOFF_RADIO_ID,
        label,
        position: [0, 0, 0],
        dialogue: [
          'SALVAGE INTAKE BROADCASTING.',
          'RELEASE CARGO OVER THE PAD FOR AUTOMATED RECOVERY.',
          'CLAIM SETTLEMENT AT THE SALVAGE BERTH.',
        ],
      },
    [label, radioBroadcast]
  );

  useRegisterDock(id, dock ?? null);
  useRegisterRadioBroadcast(groupRef, resolvedRadio);

  const setGroupRef = useCallback((el: THREE.Group | null) => {
    groupRef.current = el!;
  }, []);

  useEffect(() => {
    registerCollidable({
      id: structureCollisionId,
      label,
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      shape: { type: 'box', halfExtents: new THREE.Vector3(10, 10.5, 20) },
      physicalCollision: false,
      getObject3D: () => groupRef.current,
    });
    return () => {
      unregisterCollidable(structureCollisionId);
    };
  }, [label, structureCollisionId]);

  useFrame((_, delta) => {
    if (!dock) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const active = transitionRef.current;
    if (active) {
      const handle = listCargoContainers().find((c) => c.id === active.cargoId);
      const group = handle?.getGroup() ?? null;
      if (!handle || !group || handle.isConsumed()) {
        transitionRef.current = null;
        return;
      }

      if (group.parent !== anchor) {
        anchor.attach(group);
      }

      const rotationAligned = rotateTowardQuaternion(
        group.quaternion,
        LOCAL_PAD_FORWARD_QUAT,
        SALVAGE_DROPOFF_ROTATE_SPEED * delta
      );

      if (active.stage === 'align') {
        const nextX = moveTowardScalar(group.position.x, 0, SALVAGE_DROPOFF_ALIGN_SPEED * delta);
        const nextZ = moveTowardScalar(group.position.z, 0, SALVAGE_DROPOFF_ALIGN_SPEED * delta);
        group.position.set(nextX, group.position.y, nextZ);
        if (nextX === 0 && nextZ === 0 && rotationAligned) {
          group.position.set(0, group.position.y, 0);
          active.stage = 'descend';
        }
      } else {
        const nextY = moveTowardScalar(
          group.position.y,
          SALVAGE_DROPOFF_REST_LOCAL_Y,
          SALVAGE_DROPOFF_DESCEND_SPEED * delta
        );
        group.position.set(0, nextY, 0);
        if (nextY === SALVAGE_DROPOFF_REST_LOCAL_Y) {
          group.quaternion.copy(LOCAL_PAD_FORWARD_QUAT);
          handle.syncFromGroup();

          const unitsTransferred = transferAllInventory(
            { kind: 'dock', dockId: active.cargoId },
            { kind: 'dock', dockId: inventoryOwnerId },
            { setSalvagedBy: PLAYER_SALVAGED_BY }
          );
          handle.completeDropOff();
          transitionRef.current = null;

          const completed: CargoDropOffCompletedDetail = {
            cargoId: active.cargoId,
            padId: id,
            inventoryOwnerId,
            unitsTransferred,
          };
          window.dispatchEvent(
            new CustomEvent(EVENT_CARGO_DROPOFF_COMPLETED, { detail: completed })
          );

          // Event-driven hail about the delivery.
          setIncomingHail(SALVAGE_DROPOFF_RADIO_ID);
          window.dispatchEvent(
            new CustomEvent('NPCHailRequest', {
              detail: {
                shipId: SALVAGE_DROPOFF_RADIO_ID,
                type: 'trade',
                dialogueTreeId: SALVAGE_DROPOFF_HAIL_TREE_ID,
                header: 'SALVAGE INTAKE — DELIVERY LOGGED',
                body: 'Automated recovery complete. Tagged salvage is in the depot. Hail for settlement details, or dock at the Salvage Berth to claim your share.',
              },
            })
          );
        }
      }
      return;
    }

    // Capture: free crate near pad, slow enough, not already consumed.
    if (!groupRef.current) return;
    groupRef.current.getWorldPosition(_padPos);

    // Skip the scan when the ship is far away — containers damp to a stop
    // quickly and can't reach the pad from beyond this range.
    if (shipPosRef.current.distanceToSquared(_padPos) > SALVAGE_DROPOFF_SCAN_ACTIVATION_RANGE_SQ)
      return;

    for (const handle of listCargoContainers()) {
      if (handle.isTowed() || handle.isDropOffBusy() || handle.isConsumed()) continue;
      handle.getWorldPosition(_cratePos);
      handle.getWorldVelocity(_crateVel);
      const dx = _cratePos.x - _padPos.x;
      const dz = _cratePos.z - _padPos.z;
      const planarDist = Math.hypot(dx, dz);
      if (planarDist > captureRadius) continue;
      const speed = Math.hypot(_crateVel.x, _crateVel.z);
      if (speed > maxCaptureSpeed) continue;

      if (!handle.beginDropOff(anchor)) continue;

      transitionRef.current = { cargoId: handle.id, stage: 'align' };
      const started: CargoDropOffStartedDetail = { cargoId: handle.id, padId: id };
      window.dispatchEvent(new CustomEvent(EVENT_CARGO_DROPOFF_STARTED, { detail: started }));
      break;
    }
  });

  return (
    <group
      ref={setGroupRef}
      rotation={[0, Math.PI, 0]}
      onClick={(e) => {
        e.stopPropagation();
        selectTarget(label);
      }}
    >
      <pointLight position={[0, 40, 0]} intensity={1000} color="white" distance={60} />
      {/* <PowerSource scale={1} /> */}
      <primitive object={modelScene} scale={scale} />
      {/* Intake anchor — crate is parented here during align/descend. */}
      <group ref={anchorRef} position={[0, 6, 0]} />
    </group>
  );
}

useGLTF.preload('/landing-pad.glb');
