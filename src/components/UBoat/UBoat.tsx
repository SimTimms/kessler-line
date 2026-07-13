import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { selectTarget } from '../../context/TargetSelection';
import {
  useRegisterWorldObject,
  type WorldObjectRegistrationConfig,
} from '../../hooks/useRegisterWorldObject';
import { boxColliderFromObject } from '../../utils/colliderFromObject';
import type { BattleshipScanConfig } from '../../config/battleshipScanConfig';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { useRegisterRadioBroadcast } from '../../hooks/useRegisterRadioBroadcast';
import { sampleMoonOrbit, type MoonOrbitConfig } from '../../utils/moonOrbit';
import DockingBay from '../WorldObjects/DockingBay';
import RailgunOxygenVents from '../Ship/RailgunOxygenVents';
import type { DockConfig } from '../../config/dockConfig';
import { useShipPhysics, type ShipPhysicsOptions } from '../../hooks/shipPhysics';
import { setVesselFuel } from '../../context/VesselStateStore';

export type { BattleshipScanConfig };

function battleshipRegistration(
  scan: BattleshipScanConfig,
  halfExtents: THREE.Vector3
): WorldObjectRegistrationConfig {
  const {
    id,
    label,
    magnetic = false,
    driveSignature = false,
    proximity = false,
    physicalCollision = false,
  } = scan;
  return {
    id,
    ...(magnetic && { magnetic: { label } }),
    ...(driveSignature && { driveSignature: { label } }),
    ...((proximity || physicalCollision) && {
      collidable: {
        shape: { type: 'box', halfExtents: halfExtents.clone() },
      },
    }),
  };
}

interface UBoatProps {
  scale?: number;
  scan: BattleshipScanConfig;
  position?: [number, number, number];
  /** When set, the ship circles the moon; apexPosition is the highest point on the path. */
  orbit?: MoonOrbitConfig;
  /** When set, registers this object as an in-scene radio contact. */
  radioBroadcast?: RadioBroadcastDef;
  /** Spawn hull vent particles at impact points (listens for RailgunDamagePoints). */
  impactVents?: boolean;
  /** Enable vessel physics + attachable Thruster children. */
  flyable?: boolean;
  /** Physics backend for flyable mode. */
  physicsMode?: 'vessel' | 'ship';
  /** Starting fuel when `flyable` (0–100 scale). */
  initialFuel?: number;
  /** Optional gates when `physicsMode="ship"`. */
  shipPhysicsOptions?: ShipPhysicsOptions;
  children?: ReactNode;
  /** Optional editor/testing docking bay override. */
  dockingBay?: {
    stationId?: string;
    scale?: number;
    dimensions?: [number, number, number];
    position?: [number, number, number];
    rotation?: [number, number, number];
    dock?: DockConfig;
    debugDockOnClick?: boolean;
  };
  /** Optional physics options for flyable mode. */
}

const _orbitPosition = new THREE.Vector3();
const _orbitSample = { position: _orbitPosition, tangent: new THREE.Vector3() };

export default function UBoat({
  scale = 20,
  scan,
  position = [0, 0, 0],
  orbit,
  radioBroadcast,
  dockingBay,
  impactVents = false,
  flyable = false,
  physicsMode = 'vessel',
  initialFuel = 100,
  shipPhysicsOptions,
  children,
}: UBoatProps) {
  const gltf = useGLTF('/uboat.glb') as unknown as { scene: THREE.Group };
  // Clone the GLTF root per-instance so HMR/remounts do not reuse mutated transforms.
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const rootRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const dockingPortRef = useRef<THREE.Group>(null!);
  useRegisterRadioBroadcast(bodyRef, radioBroadcast);

  const { halfExtents, meshOffset } = useMemo(
    () => boxColliderFromObject(modelScene, scale),
    [modelScene, scale]
  );
  const shipPhysicsEnabled = flyable && physicsMode === 'ship';
  const activeMeshOffset = shipPhysicsEnabled ? new THREE.Vector3(0, 0, 0) : meshOffset;
  useEffect(() => {
    if (!flyable) return;
    setVesselFuel(scan.id, initialFuel);
  }, [flyable, initialFuel, scan.id]);
  useShipPhysics({
    vesselId: scan.id,
    selfCollisionId: scan.id,
    groupRef: rootRef,
    dockingPortRef,
    options: {
      enabled: shipPhysicsEnabled,
      ...(shipPhysicsOptions ?? {}),
    },
  });

  const registration = useMemo(
    () => battleshipRegistration(scan, halfExtents),
    [scan, halfExtents]
  );
  useRegisterWorldObject(bodyRef, registration);

  const dockingBayDimensions = useMemo(() => {
    const d = dockingBay?.dimensions ?? [1, 1, 1];
    return new THREE.Vector3(d[0], d[1], d[2]);
  }, [dockingBay?.dimensions]);

  const dockingBayPosition = useMemo(() => {
    const p = dockingBay?.position ?? [0, 0, 0];
    return new THREE.Vector3(p[0], p[1], p[2]);
  }, [dockingBay?.position]);

  useFrame(({ clock }) => {
    if (!orbit || !rootRef.current || flyable) return;
    const angle = (orbit.phase ?? 0) + clock.getElapsedTime() * orbit.speed;
    sampleMoonOrbit(orbit, angle, _orbitSample);
    rootRef.current.position.copy(_orbitSample.position);
  });

  return (
    <>
      <group
        ref={rootRef}
        position={orbit ? orbit.apexPosition : position}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget(scan.id);
        }}
      >
        <group ref={bodyRef} rotation={[0, 0, 0]}>
          <group position={[activeMeshOffset.x, activeMeshOffset.y, activeMeshOffset.z]}>
            <primitive object={modelScene} scale={scale} />
            {dockingBay ? (
              <DockingBay
                stationId={dockingBay.stationId ?? scan.id}
                scale={dockingBay.scale}
                dimensions={dockingBayDimensions}
                position={dockingBayPosition}
                rotation={dockingBay.rotation}
                dock={dockingBay.dock}
                debugDockOnClick={dockingBay.debugDockOnClick}
              />
            ) : null}
          </group>
          <group
            ref={dockingPortRef}
            position={[activeMeshOffset.x, activeMeshOffset.y, activeMeshOffset.z]}
          />
          {children}
        </group>
      </group>
      {impactVents ? <RailgunOxygenVents shipGroupRef={bodyRef} particleSizeScale={scale} /> : null}
    </>
  );
}

useGLTF.preload('/uboat.glb');
