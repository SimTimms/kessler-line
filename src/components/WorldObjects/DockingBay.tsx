import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import {
  selectTarget,
  selectedTargetName,
  selectedTargetVelocity,
} from '../../context/TargetSelection';
import { useRegisterDock } from '../../hooks/useRegisterDockablePartner';
import type { DockConfig } from '../../config/dockConfig';

interface DockingBayProps {
  stationId?: string;
  scale?: number;
  dimensions: THREE.Vector3;
  stationGroupRef?: { current: THREE.Group | null };
  position?: THREE.Vector3;
  rotation?: [number, number, number];
  /**
   * Full per-dock configuration: name, transferable resources, interior comms
   * contacts, and optional job board. Requires `stationId` (becomes the dock id).
   */
  dock?: DockConfig;
}

export default function DockingBay({
  stationId,
  scale = 1,
  stationGroupRef,
  position,
  dimensions,
  rotation = [0, Math.PI, 0],
  dock,
}: DockingBayProps) {
  const COLLISION_ID = stationId ? `docking-bay-${stationId}` : `docking-bay-${Math.random()}`;

  const dockConfig = useMemo(() => dock ?? null, [dock]);
  useRegisterDock(stationId, dockConfig);

  const groupRef = useRef<THREE.Group>(null!);
  const velocityRef = useRef(new THREE.Vector3());
  const prevPosRef = useRef(new THREE.Vector3());
  const hasPrevRef = useRef(false);
  const _worldPos = new THREE.Vector3();

  const setGroupRef = useCallback(
    (el: THREE.Group | null) => {
      groupRef.current = el!;
      if (stationGroupRef) stationGroupRef.current = el;
    },
    [stationGroupRef]
  );

  useEffect(() => {
    registerCollidable({
      id: COLLISION_ID,
      stationId,
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      getWorldVelocity: (target) => target.copy(velocityRef.current),
      shape: {
        type: 'box',
        halfExtents: new THREE.Vector3(dimensions.x * 0.5, dimensions.y * 0.5, dimensions.z * 0.5),
      },
      getObject3D: () => groupRef.current,
    });
    return () => {
      unregisterCollidable(COLLISION_ID);
    };
  }, [dimensions]);

  // Priority 1: run after BodyOrbit (0) so world velocity matches this frame's orbit pose.
  useFrame((_, delta) => {
    if (!groupRef.current || delta <= 0) return;
    groupRef.current.getWorldPosition(_worldPos);
    if (hasPrevRef.current) {
      velocityRef.current
        .copy(_worldPos)
        .sub(prevPosRef.current)
        .multiplyScalar(1 / delta);
    } else {
      velocityRef.current.set(0, 0, 0);
      hasPrevRef.current = true;
    }
    prevPosRef.current.copy(_worldPos);

    if (selectedTargetName === COLLISION_ID) {
      selectedTargetVelocity.copy(velocityRef.current);
    }
  }, 1);

  return (
    <>
      <group
        ref={setGroupRef}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget(COLLISION_ID, velocityRef.current);
        }}
        scale={scale}
        position={position}
      >
        <mesh>
          <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />
          <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} emissive="#ffffff" />
        </mesh>
      </group>
    </>
  );
}
