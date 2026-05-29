import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { selectTarget } from '../../context/TargetSelection';
import DockingBay from '../WorldObjects/DockingBay';
import {
  useRegisterWorldObject,
  type WorldObjectRegistrationConfig,
} from '../../hooks/useRegisterWorldObject';
import { boxColliderFromObject } from '../../utils/colliderFromObject';
import { containerInventoryToPartner } from '../../config/containerInventoryConfig';
import type { ContainerInventory } from '../../config/containerInventoryConfig';
import { useRegisterDockablePartner } from '../../hooks/useRegisterDockablePartner';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { useRegisterRadioBroadcast } from '../../hooks/useRegisterRadioBroadcast';

export type { ContainerInventory };

function containerRegistration(
  inventory: ContainerInventory,
  halfExtents: THREE.Vector3
): WorldObjectRegistrationConfig {
  return {
    id: inventory.containerId,
    magnetic: { label: inventory.label ?? 'Metal Container' },
    collidable: {
      shape: { type: 'box', halfExtents: halfExtents.clone() },
    },
  };
}

interface ContainerBritishProps {
  scale?: number;
  inventory: ContainerInventory;
  position?: [number, number, number];
  /** When set, registers this object as an in-scene radio contact. */
  radioBroadcast?: RadioBroadcastDef;
}

export default function ContainerBritish({
  scale = 1,
  inventory,
  position = [0, 0, 0],
  radioBroadcast,
}: ContainerBritishProps) {
  const gltf = useGLTF('/container-british.glb') as unknown as { scene: THREE.Group };
  const bodyRef = useRef<THREE.Group>(null);
  useRegisterRadioBroadcast(bodyRef, radioBroadcast);

  const { halfExtents, meshOffset } = useMemo(
    () => boxColliderFromObject(gltf.scene, scale),
    [gltf.scene, scale]
  );

  const registration = useMemo(
    () => containerRegistration(inventory, halfExtents),
    [inventory.containerId, halfExtents]
  );
  useRegisterWorldObject(bodyRef, registration);

  const partnerConfig = useMemo(() => containerInventoryToPartner(inventory), [inventory]);
  useRegisterDockablePartner(partnerConfig);

  const dockDimensions = new THREE.Vector3(12, 1, 1);
  return (
    <>
      <group
        rotation={[0, Math.PI, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget(inventory.containerId);
        }}
        position={position}
      >
        <group ref={bodyRef} rotation={[0, Math.PI / 2, 0]}>
          <group position={[meshOffset.x, meshOffset.y, meshOffset.z]}>
            <primitive object={gltf.scene} scale={scale} />
          </group>
        </group>
        <group position={[0, 0, -36]} rotation={[0, Math.PI, 0]}>
          <DockingBay stationId={inventory.dockingBayId} dimensions={dockDimensions} />
        </group>
      </group>
    </>
  );
}
