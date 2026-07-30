import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import PowerSource from './PowerSource';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { selectTarget } from '../../context/TargetSelection';
import DockingBay from './DockingBay';
import type { DockConfig } from '../../config/dockConfig';
import { LANDING_PAD_DOCK_CAPTURE_PROFILE } from '../../config/dockCaptureConfig';
import {
  LANDING_PAD_PLATFORM_MEET_EPSILON,
  LANDING_PAD_PLATFORM_MEET_OFFSET_Y,
  LANDING_PAD_PLATFORM_MOVE_SPEED,
  LANDING_PAD_PLATFORM_OBJECT_NAME,
} from '../../config/landingPadConfig';
import {
  clearLandingPadElevator,
  setLandingPadElevatorReady,
} from '../../context/LandingPadElevator';
import { shipPosRef } from '../../context/ShipPos';
import { EVENT_DEBUG_JUMP_DOCK } from '../../config/keybindings';

const DEFAULT_LANDING_PAD_ID = 'landing-pad';
const EVENT_DOCKING_CAPTURE_STARTED = 'DockingCaptureStarted';
const EVENT_DOCKING_CAPTURE_ENDED = 'DockingCaptureEnded';

const _shipLocal = new THREE.Vector3();
const _padWorldScale = new THREE.Vector3();

function moveTowardScalar(current: number, target: number, maxStep: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

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
  /**
   * World-Y meet offset at scale=1 when raising the LandPad platform to the ship.
   * Multiplied by `scale` at runtime. Defaults to {@link LANDING_PAD_PLATFORM_MEET_OFFSET_Y}.
   */
  landPadMeetOffsetY?: number;
}

export default function LandingPad({
  id = DEFAULT_LANDING_PAD_ID,
  label = 'Landing Pad',
  scale = 1,
  dock,
  landingPadThreshold = LANDING_PAD_DOCK_CAPTURE_PROFILE.captureRadius,
  landingPadGroupRef,
  debugJumpDockOnClick = false,
  landPadMeetOffsetY = LANDING_PAD_PLATFORM_MEET_OFFSET_Y,
}: LandingPadProps) {
  const gltf = useGLTF('/landing-pad.glb') as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const landPad = useMemo(() => {
    return (
      modelScene.getObjectByName(LANDING_PAD_PLATFORM_OBJECT_NAME) ??
      modelScene.getObjectByName('Land Pad') ??
      null
    );
  }, [modelScene]);
  /** GLB local Y — kept as the rest pose; never crushed toward 0 by scale. */
  const landPadAuthoringY = useMemo(() => landPad?.position.y ?? 0, [landPad]);
  const padScale = Math.max(1e-6, scale);
  /**
   * Offset the scaled model root so LandPad rest world-Y equals the authoring
   * height at every scale: rootY + authoringY * scale = authoringY.
   */
  const modelRootOffsetY = landPadAuthoringY * (1 - padScale);
  const groupRef = useRef<THREE.Group>(null!);
  const landPadRestLocalYRef = useRef(landPadAuthoringY);
  const trackingRef = useRef(false);
  const dockedRef = useRef(false);
  const structureCollisionId = `${id}-structure`;
  const dockingProfile = useMemo(
    () => ({
      ...LANDING_PAD_DOCK_CAPTURE_PROFILE,
      captureRadius: landingPadThreshold,
    }),
    [landingPadThreshold]
  );

  useEffect(() => {
    landPadRestLocalYRef.current = landPadAuthoringY;
    if (landPad && !trackingRef.current && !dockedRef.current) {
      landPad.position.y = landPadAuthoringY;
    }
  }, [landPad, landPadAuthoringY]);

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
      clearLandingPadElevator(id);
    };
  }, [id, label, landingPadGroupRef, structureCollisionId]);

  useEffect(() => {
    const onCaptureStarted = (event: Event) => {
      const stationId = (event as CustomEvent<{ stationId?: string | null }>).detail?.stationId;
      if (stationId !== id) return;
      trackingRef.current = true;
      if (landPad) setLandingPadElevatorReady(id, false);
    };
    const onCaptureEnded = (event: Event) => {
      const stationId = (event as CustomEvent<{ stationId?: string | null }>).detail?.stationId;
      if (stationId != null && stationId !== id) return;
      trackingRef.current = false;
    };
    const onShipDocked = (event: Event) => {
      const stationId = (event as CustomEvent<{ stationId?: string | null }>).detail?.stationId;
      if (stationId !== id) return;
      dockedRef.current = true;
      trackingRef.current = false;
      if (landPad) setLandingPadElevatorReady(id, true);
    };
    const onShipUndocked = () => {
      if (!dockedRef.current) return;
      dockedRef.current = false;
      trackingRef.current = false;
      if (landPad) setLandingPadElevatorReady(id, false);
    };

    window.addEventListener(EVENT_DOCKING_CAPTURE_STARTED, onCaptureStarted);
    window.addEventListener(EVENT_DOCKING_CAPTURE_ENDED, onCaptureEnded);
    window.addEventListener('ShipDocked', onShipDocked);
    window.addEventListener('ShipUndocked', onShipUndocked);
    return () => {
      window.removeEventListener(EVENT_DOCKING_CAPTURE_STARTED, onCaptureStarted);
      window.removeEventListener(EVENT_DOCKING_CAPTURE_ENDED, onCaptureEnded);
      window.removeEventListener('ShipDocked', onShipDocked);
      window.removeEventListener('ShipUndocked', onShipUndocked);
    };
  }, [id, landPad]);

  useFrame((_, delta) => {
    if (!landPad?.parent) return;

    const followShip = trackingRef.current || dockedRef.current;
    let targetLocalY = landPadRestLocalYRef.current;

    if (followShip) {
      // Meet offset is authored at scale=1; scale lift height with the pad.
      _shipLocal.copy(shipPosRef.current);
      _shipLocal.y += landPadMeetOffsetY * padScale;
      landPad.parent.worldToLocal(_shipLocal);
      targetLocalY = _shipLocal.y;
    }

    landPad.parent.getWorldScale(_padWorldScale);
    const worldScaleY = Math.max(1e-6, Math.abs(_padWorldScale.y));
    const maxStepLocal = (LANDING_PAD_PLATFORM_MOVE_SPEED * delta) / worldScaleY;
    const nextY = moveTowardScalar(landPad.position.y, targetLocalY, maxStepLocal);
    landPad.position.y = nextY;

    if (trackingRef.current || dockedRef.current) {
      const worldError = Math.abs(nextY - targetLocalY) * worldScaleY;
      setLandingPadElevatorReady(id, worldError <= LANDING_PAD_PLATFORM_MEET_EPSILON);
    }
  });

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
        {/* Scale on a wrapper + Y offset so rest world height stays authoring-Y at any scale. */}
        <group position={[0, modelRootOffsetY, 0]} scale={padScale}>
          <primitive object={modelScene} />
        </group>
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
