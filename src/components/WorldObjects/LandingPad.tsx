import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import PowerSource from './PowerSource';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { selectTarget } from '../../context/TargetSelection';
import DockingBay from './DockingBay';
import type { DockConfig } from '../../config/dockConfig';
import { LANDING_PAD_DOCK_CAPTURE_PROFILE } from '../../config/dockCaptureConfig';
import { EVENT_DEBUG_JUMP_DOCK } from '../../config/keybindings';

const DEFAULT_LANDING_PAD_ID = 'landing-pad';

interface LandingPadProps {
  /** Unique id for collision + dock registration (required when multiple pads share a scene). */
  id?: string;
  label?: string;
  scale?: number;
  dock?: DockConfig;
  landingPadThreshold?: number;
  /** World-space bounding radius for collision detection. Tune to match visual size. */
  landingPadGroupRef?: { current: THREE.Group | null };
  /**
   * Inventory/authoring debug: clicking the pad teleports the ship above it and
   * starts the normal hover docking procedure.
   */
  debugJumpDockOnClick?: boolean;
}

export default function LandingPad({
  id = DEFAULT_LANDING_PAD_ID,
  label = 'Landing Pad',
  scale = 1,
  dock,
  landingPadThreshold = LANDING_PAD_DOCK_CAPTURE_PROFILE.captureRadius,
  landingPadGroupRef,
  debugJumpDockOnClick = false,
}: LandingPadProps) {
  const gltf = useGLTF('/landing-pad.glb') as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null!);
  const structureCollisionId = `${id}-structure`;
  const dockingProfile = useMemo(
    () => ({
      ...LANDING_PAD_DOCK_CAPTURE_PROFILE,
      captureRadius: landingPadThreshold,
    }),
    [landingPadThreshold]
  );

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
      id: structureCollisionId,
      label,
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
      unregisterCollidable(structureCollisionId);
    };
  }, [label, landingPadGroupRef, structureCollisionId]);

  return (
    <>
      <group
        ref={setGroupRef}
        rotation={[0, Math.PI, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget(label);
          if (debugJumpDockOnClick) {
            window.dispatchEvent(
              new CustomEvent(EVENT_DEBUG_JUMP_DOCK, { detail: { stationId: id } })
            );
          }
        }}
      >
        <PowerSource scale={1} />
        <primitive object={modelScene} scale={scale} />
        {/* Keep the docking anchor at pad center so X/Z threshold checks match landing-pad position. */}
        <group position={[0, 6, 0]}>
          <DockingBay
            stationId={id}
            dimensions={new THREE.Vector3(40, 2, 10)}
            rotation={[0, 0, 0]}
            dock={dock}
            dockingProfile={dockingProfile}
            showCaptureMesh={false}
          />
        </group>
      </group>
    </>
  );
}
