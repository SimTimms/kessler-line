/**
 * CommsBufferSatellite — dockable satellite orbiting Mars.
 *
 * Uses the shared gravity integrator (`src/physics/`) so that all orbiting
 * objects share the same reference-frame tracking pipeline as the ship.
 * Registers a collidable with velocity tracking so the docking system can
 * compute correct relative speed. Uses useRegisterDock for the dock config
 * registration.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  registerCollidable,
  unregisterCollidable,
} from '../../../context/CollisionRegistry';
import {
  registerRadioBroadcast,
  unregisterRadioBroadcast,
} from '../../../context/RadioBroadcastRegistry';
import { selectTarget } from '../../../context/TargetSelection';
import { useRegisterDock } from '../../../hooks/useRegisterDockablePartner';
import { DEFAULT_DOCK_CAPTURE_PROFILE } from '../../dockCaptureConfig';
import { COMMS_BUFFER_DOCK_CONFIG } from './comms-buffer-dock-config';
import {
  COMMS_BUFFER_SATELLITE_ID,
  COMMS_BUFFER_SATELLITE_LABEL,
  BUFFER_ORBIT_RADIUS,
  BUFFER_ORBIT_PHASE,
  BUFFER_ORBIT_INCLINATION_Z,
  BUFFER_ORBIT_INCLINATION_X,
} from './comms-relay-config';
import { initCircularOrbit, stepOrbit } from '../../../physics';
import type { OrbitState } from '../../../physics';

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

  const groupRef = useRef<THREE.Group>(null);
  const orbitStateRef = useRef<OrbitState | null>(null);

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
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      getWorldVelocity: (target) => {
        const state = orbitStateRef.current;
        return state ? target.copy(state.velocity) : target.set(0, 0, 0);
      },
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
      getObject3D: () => groupRef.current,
    });
    return () => unregisterCollidable(COLLISION_ID);
  }, []);

  // Register as a radio broadcast so the scanner can detect the satellite.
  useEffect(() => {
    registerRadioBroadcast({
      id: COMMS_BUFFER_SATELLITE_ID,
      label: COMMS_BUFFER_SATELLITE_LABEL,
      getPosition: (target) => target.copy(commsBufferWorldPos),
      dialogue: [
        'COMMS BUFFER SATELLITE — AUTOMATED BEACON.',
        'RELAY NODE OFFLINE. LOCAL BUFFER STORAGE ACTIVE.',
        'DOCKING PORT AVAILABLE FOR LOG RETRIEVAL.',
      ],
      dockable: true,
    });
    return () => unregisterRadioBroadcast(COMMS_BUFFER_SATELLITE_ID);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // ── Initialise on first frame ──────────────────────────────────────
    if (!orbitStateRef.current) {
      const init = initCircularOrbit({
        bodyId: 'Mars',
        radius: BUFFER_ORBIT_RADIUS,
        phase: BUFFER_ORBIT_PHASE,
        inclinationX: BUFFER_ORBIT_INCLINATION_X,
        inclinationZ: BUFFER_ORBIT_INCLINATION_Z,
      });

      orbitStateRef.current = {
        position: init.position,
        velocity: init.velocity,
        primaryBodyId: init.bodyId,
        primaryBodyVelocity: init.bodyVelocity,
      };
    }

    const state = orbitStateRef.current;

    // ── Gravity integration ────────────────────────────────────────────
    stepOrbit(state, delta);
    state.position.addScaledVector(state.velocity, delta);

    // ── Sync scene + exports ───────────────────────────────────────────
    commsBufferWorldPos.copy(state.position);
    groupRef.current.position.copy(state.position);
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        selectTarget(COLLISION_ID);
      }}
    >
      <primitive object={modelScene} scale={0.4} />
    </group>
  );
}

useGLTF.preload(SATELLITE_URL);
