import { useRef, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { selectTarget } from '../../context/TargetSelection';
import { useRegisterDock } from '../../hooks/useRegisterDockablePartner';
import type { DockConfig } from '../../config/dockConfig';
import type { DockCaptureProfile } from '../../config/dockCaptureConfig';

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
  /** Optional docking behavior override (capture probe, speed gate, attach offset). */
  dockingProfile?: DockCaptureProfile;
  /** Render the translucent capture box mesh (debug/authoring aid). */
  showCaptureMesh?: boolean;
}

export default function DockingBay({
  stationId,
  scale = 1,
  stationGroupRef,
  position,
  dimensions,
  rotation = [0, Math.PI, 0],
  dock,
  dockingProfile,
  showCaptureMesh = true,
}: DockingBayProps) {
  const COLLISION_ID = stationId ? `docking-bay-${stationId}` : `docking-bay-${Math.random()}`;

  const dockConfig = useMemo(() => dock ?? null, [dock]);
  useRegisterDock(stationId, dockConfig);

  const groupRef = useRef<THREE.Group>(null!);

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
      getWorldVelocity: (target) => target.set(0, 0, 0),
      shape: {
        type: 'box',
        halfExtents: new THREE.Vector3(dimensions.x * 0.5, dimensions.y * 0.5, dimensions.z * 0.5),
      },
      // Docking volumes are scan/dock capture zones, never hull-collision solids.
      physicalCollision: false,
      dockingProfile,
      getObject3D: () => groupRef.current,
    });
    return () => {
      unregisterCollidable(COLLISION_ID);
    };
  }, [COLLISION_ID, dimensions, dockingProfile, stationId]);

  return (
    <>
      <group
        ref={setGroupRef}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget(COLLISION_ID);
        }}
        scale={scale}
        position={position}
      >
        {showCaptureMesh && (
          <>
            <mesh>
              <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />
              <meshStandardMaterial
                color="#ffffff"
                side={THREE.DoubleSide}
                emissive="#ffffff"
                transparent
                opacity={1}
              />
            </mesh>
          </>
        )}
        <mesh position={[-2 * scale, 0, 0]}>
          <sphereGeometry args={[0.2 * scale, 10, 10]} />
          <meshStandardMaterial
            color="#ff0000"
            side={THREE.DoubleSide}
            emissive="#ff0000"
            transparent
            opacity={1}
          />
        </mesh>
        <mesh position={[2 * scale, 0, 0]}>
          <sphereGeometry args={[0.2 * scale, 10, 10]} />
          <meshStandardMaterial
            color="#00ff00"
            side={THREE.DoubleSide}
            emissive="#00ff00"
            transparent
            opacity={1}
          />
        </mesh>
      </group>
    </>
  );
}
