/**
 * CommsBufferSatellite — dockable satellite orbiting Mars.
 *
 * Tracks Mars position via gravityBodies each frame (same pattern as MarsSystem).
 * Registers a collidable with velocity tracking so the docking system can compute
 * correct relative speed. Uses useRegisterDock for the dock config registration.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { gravityBodies } from '../../../context/GravityRegistry';
import {
  registerCollidable,
  unregisterCollidable,
} from '../../../context/CollisionRegistry';
import { selectTarget } from '../../../context/TargetSelection';
import { useRegisterDock } from '../../../hooks/useRegisterDockablePartner';
import { DEFAULT_DOCK_CAPTURE_PROFILE } from '../../dockCaptureConfig';
import { COMMS_BUFFER_DOCK_CONFIG } from './comms-buffer-dock-config';
import {
  COMMS_BUFFER_SATELLITE_ID,
  COMMS_BUFFER_SATELLITE_LABEL,
  BUFFER_ORBIT_RADIUS,
  BUFFER_ORBIT_SPEED,
  BUFFER_ORBIT_PHASE,
  BUFFER_ORBIT_INCLINATION_Z,
  BUFFER_ORBIT_INCLINATION_X,
} from './comms-relay-config';

const SATELLITE_URL = '/satellite.glb';
const COLLISION_ID = `docking-bay-${COMMS_BUFFER_SATELLITE_ID}`;

/** Docking profile — higher max speed to account for orbital velocity matching. */
const SATELLITE_DOCK_PROFILE = {
  ...DEFAULT_DOCK_CAPTURE_PROFILE,
  maxRelativeSpeed: 18,
};

const BAY_DIMENSIONS = new THREE.Vector3(16, 10, 16);

/** Module-level world position updated each frame — read by the mission controller. */
export const commsBufferWorldPos = new THREE.Vector3();

export default function CommsBufferSatellite() {
  const { scene: modelScene } = useGLTF(SATELLITE_URL);

  const rootRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const prevPosRef = useRef(new THREE.Vector3());
  const velocityRef = useRef(new THREE.Vector3());
  const hasPrevRef = useRef(false);

  // Register dock config so the dock interior panel works when docked.
  const dockConfig = useMemo(() => COMMS_BUFFER_DOCK_CONFIG, []);
  useRegisterDock(COMMS_BUFFER_SATELLITE_ID, dockConfig);

  // Register collidable with velocity tracking for correct docking speed gate.
  useEffect(() => {
    registerCollidable({
      id: COLLISION_ID,
      label: COMMS_BUFFER_SATELLITE_LABEL,
      stationId: COMMS_BUFFER_SATELLITE_ID,
      getWorldPosition: (target) => {
        if (innerRef.current) innerRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (innerRef.current) innerRef.current.getWorldQuaternion(target);
        return target;
      },
      getWorldVelocity: (target) => target.copy(velocityRef.current),
      shape: {
        type: 'box',
        halfExtents: new THREE.Vector3(
          BAY_DIMENSIONS.x * 0.5,
          BAY_DIMENSIONS.y * 0.5,
          BAY_DIMENSIONS.z * 0.5,
        ),
      },
      physicalCollision: false,
      dockingProfile: SATELLITE_DOCK_PROFILE,
      getObject3D: () => innerRef.current,
    });
    return () => unregisterCollidable(COLLISION_ID);
  }, []);

  useFrame((_, delta) => {
    const mars = gravityBodies.get('Mars');
    if (!rootRef.current || !mars) return;

    // Follow Mars
    rootRef.current.position.copy(mars.position);

    // Advance orbit
    if (orbitRef.current) {
      orbitRef.current.rotation.y += BUFFER_ORBIT_SPEED * delta;
    }

    // Track world position + velocity for docking and nav waypoint
    if (innerRef.current) {
      innerRef.current.getWorldPosition(commsBufferWorldPos);

      if (hasPrevRef.current && delta > 0) {
        velocityRef.current
          .subVectors(commsBufferWorldPos, prevPosRef.current)
          .multiplyScalar(1 / delta);
      } else {
        velocityRef.current.set(0, 0, 0);
      }
      prevPosRef.current.copy(commsBufferWorldPos);
      hasPrevRef.current = true;
    }
  });

  return (
    <group ref={rootRef}>
      <group rotation-z={BUFFER_ORBIT_INCLINATION_Z} rotation-x={BUFFER_ORBIT_INCLINATION_X}>
        <group ref={orbitRef} rotation-y={BUFFER_ORBIT_PHASE}>
          <group
            ref={innerRef}
            position={[BUFFER_ORBIT_RADIUS, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              selectTarget(COLLISION_ID);
            }}
          >
            <primitive object={modelScene} scale={0.4} />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(SATELLITE_URL);
