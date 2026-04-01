import { useRef, useCallback, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PowerSource from './PowerSource';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { selectTarget } from '../../context/TargetSelection';
import DockingBay from './DockingBay';
import RadioBeacon from '../Radio/RadioBeacon';
import type { mx_bilerp_0 } from 'three/src/nodes/materialx/lib/mx_noise.js';

const COLLISION_ID = 'fuel-station';

interface FuelStationProps {
  url: string;
  scale?: number;
  /** World-space bounding radius for collision detection. Tune to match visual size. */
  collisionRadius?: number;
  stationGroupRef?: { current: THREE.Group | null };
}

export default function FuelStation({
  url,
  scale = 1,
  collisionRadius = 10405,
  stationGroupRef,
}: FuelStationProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
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
      shape: { type: 'box', halfExtents: new THREE.Vector3(10, 10.5, 20) },
      getObject3D: () => groupRef.current,
    });
    return () => {
      unregisterCollidable(COLLISION_ID);
    };
  }, [collisionRadius]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += -delta * 0.00004;
  });

  const dockDimensions = new THREE.Vector3(24, 12, 1);
  return (
    <>
      <group
        ref={setGroupRef}
        rotation={[0, Math.PI, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget('N51744X');
        }}
        scale={4}
      >
        <PowerSource scale={0.1} />
        <primitive object={gltf.scene} scale={scale} />
        <group position={[0, 5, 0]}>
          <group>
            <DockingBay stationId="fuel-station" dimensions={dockDimensions} rotation={[0, 0, 0]} />
          </group>
          <group position={[0, 0, -110]}>
            <DockingBay stationId="fuel-station" dimensions={dockDimensions} rotation={[0, 0, 0]} />
          </group>
          <group position={[110, 0, 0]}>
            <DockingBay
              stationId="fuel-station"
              dimensions={dockDimensions}
              rotation={[0, Math.PI * 0.5, 0]}
            />
          </group>
          <group position={[-110, 0, 0]}>
            <DockingBay
              stationId="fuel-station"
              dimensions={dockDimensions}
              rotation={[0, Math.PI * 0.5, 0]}
            />
          </group>
        </group>
        <RadioBeacon />
      </group>
    </>
  );
}
