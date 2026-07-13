import { useRef, useCallback, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import PowerSource from './PowerSource';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { selectTarget } from '../../context/TargetSelection';
import DockingBay from './DockingBay';
import type { DockConfig } from '../../config/dockConfig';
import { LANDING_PAD_DOCK_CAPTURE_PROFILE } from '../../config/dockCaptureConfig';

const LANDING_PAD_COLLISION_ID = 'landing-pad-structure';
const LANDING_PAD_DOCK_ID = 'landing-pad';

interface LandingPadProps {
  scale?: number;
  dock?: DockConfig;
  /** World-space bounding radius for collision detection. Tune to match visual size. */
  landingPadGroupRef?: { current: THREE.Group | null };
}

export default function LandingPad({ scale = 1, dock, landingPadGroupRef }: LandingPadProps) {
  const gltf = useGLTF('/landing-pad.glb') as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null!);

  // Fill the external stationGroupRef (if provided) so LaserRay can raycast against it.
  const setGroupRef = useCallback(
    (el: THREE.Group | null) => {
      groupRef.current = el!;
      if (landingPadGroupRef) landingPadGroupRef.current = el;
    },
    [landingPadGroupRef]
  );

  // Register as a collidable. The ref is guaranteed set before this effect runs
  // (effects fire after commit, which is after setGroupRef fires).
  useEffect(() => {
    registerCollidable({
      id: LANDING_PAD_COLLISION_ID,
      label: 'Landing Pad',
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      shape: { type: 'box', halfExtents: new THREE.Vector3(10, 10.5, 20) },
      // Keep the pad scannable/targetable, but don't physically collide the ship with it.
      physicalCollision: false,
      getObject3D: () => groupRef.current,
    });
    return () => {
      unregisterCollidable(LANDING_PAD_COLLISION_ID);
    };
  }, [landingPadGroupRef]);

  return (
    <>
      <group
        ref={setGroupRef}
        rotation={[0, Math.PI, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget('Landing Pad');
        }}
      >
        <PowerSource scale={1} />
        <primitive object={gltf.scene} scale={scale} />
        <group position={[0, 6, 104]}>
          <DockingBay
            stationId={LANDING_PAD_DOCK_ID}
            dimensions={new THREE.Vector3(40, 2, 10)}
            rotation={[0, 0, 0]}
            dock={dock}
            dockingProfile={LANDING_PAD_DOCK_CAPTURE_PROFILE}
            showCaptureMesh={false}
          />
        </group>
      </group>
    </>
  );
}
