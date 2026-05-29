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

interface BattleshipBritishProps {
  scale?: number;
  scan: BattleshipScanConfig;
  position?: [number, number, number];
  /** When set, the ship circles the moon; apexPosition is the highest point on the path. */
  orbit?: MoonOrbitConfig;
  /** When set, registers this object as an in-scene radio contact. */
  radioBroadcast?: RadioBroadcastDef;
}

const _orbitPosition = new THREE.Vector3();
const _orbitSample = { position: _orbitPosition, tangent: new THREE.Vector3() };

export default function BattleshipBritish({
  scale = 20,
  scan,
  position = [0, 0, 0],
  orbit,
  radioBroadcast,
}: BattleshipBritishProps) {
  const gltf = useGLTF('/battleship-british.glb') as unknown as { scene: THREE.Group };
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  useRegisterRadioBroadcast(bodyRef, radioBroadcast);

  const { halfExtents, meshOffset } = useMemo(
    () => boxColliderFromObject(gltf.scene, scale),
    [gltf.scene, scale]
  );

  const registration = useMemo(
    () => battleshipRegistration(scan, halfExtents),
    [scan.id, scan.label, scan.magnetic, scan.driveSignature, scan.proximity, halfExtents]
  );
  useRegisterWorldObject(bodyRef, registration);

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
          <primitive object={gltf.scene} scale={scale} />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/battleship-british.glb');
