import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import {
  selectTarget,
  selectedTargetName,
  selectedTargetVelocity,
} from '../../context/TargetSelection';
import { useRegisterDockablePartner } from '../../hooks/useRegisterDockablePartner';
import type { DockablePartnerConfig } from '../../context/DockablePartnerStore';

/**
 * The resource parameters of a docking bay, minus `partnerId` (which is derived
 * from `stationId` so the bay's collision id and its resource registration can
 * never drift apart). Pass any subset of fuel/o2/power/crew that this bay offers.
 */
export type DockingBayPartner = Omit<DockablePartnerConfig, 'partnerId'>;

interface DockingBayProps {
  stationId?: string;
  scale?: number;
  dimensions: THREE.Vector3;
  stationGroupRef?: { current: THREE.Group | null };
  position?: THREE.Vector3;
  rotation?: [number, number, number];
  /**
   * Transferable resources offered at this bay (fuel, air/o2, power, crew) plus
   * the docking-panel label. When provided, the bay registers itself as a
   * dockable partner — no separate `useRegisterDockablePartner` call needed.
   * Requires `stationId` (it becomes the partner id).
   */
  partner?: DockingBayPartner;
}

export default function DockingBay({
  stationId,
  scale = 1,
  stationGroupRef,
  position,
  dimensions,
  rotation = [0, Math.PI, 0],
  partner,
}: DockingBayProps) {
  const COLLISION_ID = stationId ? `docking-bay-${stationId}` : `docking-bay-${Math.random()}`;

  // Register the transferable resources for this bay, keyed by stationId so the
  // partner id always matches the `ShipDocked` event's stationId. No-op when no
  // `partner` is supplied or when the bay has no stationId to key off.
  const partnerConfig = useMemo<DockablePartnerConfig | null>(
    () => (partner && stationId ? { partnerId: stationId, ...partner } : null),
    [partner, stationId]
  );
  useRegisterDockablePartner(partnerConfig);

  const groupRef = useRef<THREE.Group>(null!);
  const velocityRef = useRef(new THREE.Vector3());
  const prevPosRef = useRef(new THREE.Vector3());
  const hasPrevRef = useRef(false);
  const _worldPos = new THREE.Vector3();

  // Fill the external stationGroupRef (if provided) so LaserRay can raycast against it.
  const setGroupRef = useCallback(
    (el: THREE.Group | null) => {
      groupRef.current = el!;
      if (stationGroupRef) stationGroupRef.current = el;
    },
    [stationGroupRef]
  );

  // Register as a collidable. The ref is guaranteed set before this effect runs
  // (effects fire after commit, which is after setGroupRef fires).
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
  });

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
