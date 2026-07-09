import { useMemo, useRef } from 'react';
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
import type { DockConfig } from '../../config/dockConfig';

export type { BattleshipScanConfig };

function battleshipRegistration(
  scan: BattleshipScanConfig,
  halfExtents: THREE.Vector3
): WorldObjectRegistrationConfig {
  const { id, label, magnetic = false, driveSignature = false, proximity = false } = scan;
  return {
    id,
    ...(magnetic && { magnetic: { label } }),
    ...(driveSignature && { driveSignature: { label } }),
    ...(proximity && {
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
}: UBoatProps) {
  const gltf = useGLTF('/uboat.glb') as unknown as { scene: THREE.Group };
  // Clone the GLTF root per-instance so HMR/remounts do not reuse mutated transforms.
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  useRegisterRadioBroadcast(bodyRef, radioBroadcast);

  const { halfExtents, meshOffset } = useMemo(
    () => boxColliderFromObject(modelScene, scale),
    [modelScene, scale]
  );

  const registration = useMemo(
    () => battleshipRegistration(scan, halfExtents),
    [scan.id, scan.label, scan.magnetic, scan.driveSignature, scan.proximity, halfExtents]
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
    if (!orbit || !rootRef.current) return;
    const angle = (orbit.phase ?? 0) + clock.getElapsedTime() * orbit.speed;
    sampleMoonOrbit(orbit, angle, _orbitSample);
    rootRef.current.position.copy(_orbitSample.position);
  });

  return (
    <group
      ref={rootRef}
      position={orbit ? orbit.apexPosition : position}
      onClick={(e) => {
        e.stopPropagation();
        selectTarget(scan.id);
      }}
    >
      <group ref={bodyRef} rotation={[0, 0, 0]}>
        <group position={[meshOffset.x, meshOffset.y, meshOffset.z]}>
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
      </group>
    </group>
  );
}

useGLTF.preload('/uboat.glb');
