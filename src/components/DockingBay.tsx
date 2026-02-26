import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';
import { selectTarget } from '../context/TargetSelection';

interface DockingBayProps {
  scale?: number;
  dimensions: THREE.Vector3;
  stationGroupRef?: { current: THREE.Group | null };
  position?: THREE.Vector3;
  rotation?: [number, number, number];
}

export default function DockingBay({
  scale = 1,
  stationGroupRef,
  position,
  dimensions,
  rotation = [0, Math.PI, 0],
}: DockingBayProps) {
  const COLLISION_ID = `docking-bay-${Math.random()}`;

  const groupRef = useRef<THREE.Group>(null!);

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
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      shape: {
        type: 'box',
        halfExtents: new THREE.Vector3(dimensions.x * 0.5, dimensions.y * 0.5, dimensions.z * 0.5),
      },
    });
    return () => {
      unregisterCollidable(COLLISION_ID);
    };
  }, [dimensions]);

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
        <mesh>
          <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />
          <meshBasicMaterial
            color="#00ff88"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}
