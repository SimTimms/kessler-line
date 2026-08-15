/**
 * DeployedSatellite — renders the deployed satellite after the Elias Voss mission.
 *
 * Two-phase animation after undocking:
 *   Phase 1 (30 s) — real physics: gravity from Mars applied each frame so the
 *                     satellite tracks the same orbital path as the ship.
 *   Phase 2         — non-physical circular orbit locked at the position/speed
 *                     reached at the end of Phase 1, with y-axis descent.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { gravityBodies } from '../../context/GravityRegistry';
import { deployedSatelliteRef } from '../../context/DeployedSatelliteState';

const CONTAINER_URL = '/container.glb';

/** How long the satellite keeps real physics after release (seconds). */
const PHYSICS_DURATION = 30;

/** Descent speed on the y-axis once orbit is locked (units/s). */
const DESCENT_SPEED = 5;

// Scratch vectors — avoid per-frame allocations.
const _gravDir = new THREE.Vector3();

export default function DeployedSatellite() {
  const { scene: modelScene } = useGLTF(CONTAINER_URL);
  const groupRef = useRef<THREE.Group>(null);

  // ── Phase 1 (physics) state ──
  const initializedRef = useRef(false);
  const posRef = useRef(new THREE.Vector3());
  const velRef = useRef(new THREE.Vector3());
  const timerRef = useRef(0);

  // ── Phase 2 (locked orbit) state ──
  const orbitLockedRef = useRef(false);
  const orbitRadiusRef = useRef(0);
  const angleRef = useRef(0);
  const angularSpeedRef = useRef(0);
  const yRef = useRef(0);

  useFrame((_, delta) => {
    const data = deployedSatelliteRef.current;
    if (!data || !data.deployed || !groupRef.current) return;

    // Make visible on first frame with deployment data
    if (!groupRef.current.visible) groupRef.current.visible = true;

    const mars = gravityBodies.get('Mars');
    if (!mars) return;

    // ── Initialise from release data (once) ──
    if (!initializedRef.current) {
      posRef.current.set(data.releaseX, mars.position.y, data.releaseZ);
      velRef.current.set(data.releaseVelX, 0, data.releaseVelZ);
      timerRef.current = 0;
      orbitLockedRef.current = false;
      yRef.current = 0;
      initializedRef.current = true;
    }

    // ── Phase 1: physics with gravity ──
    if (!orbitLockedRef.current) {
      timerRef.current += delta;

      // Gravitational acceleration toward Mars: a = mu / r², direction toward centre
      const distSq = posRef.current.distanceToSquared(mars.position);
      if (distSq > 1) {
        _gravDir.subVectors(mars.position, posRef.current).normalize();
        velRef.current.addScaledVector(_gravDir, (mars.mu / distSq) * delta);
      }

      // Integrate position
      posRef.current.addScaledVector(velRef.current, delta);
      // Keep on the orbital plane
      posRef.current.y = mars.position.y;

      groupRef.current.position.copy(posRef.current);

      // Transition to Phase 2 after PHYSICS_DURATION
      if (timerRef.current >= PHYSICS_DURATION) {
        const relX = posRef.current.x - mars.position.x;
        const relZ = posRef.current.z - mars.position.z;
        orbitRadiusRef.current = Math.sqrt(relX * relX + relZ * relZ);
        angleRef.current = Math.atan2(relZ, relX);

        // Tangential speed → angular speed for circular orbit lock
        const tanX = -Math.sin(angleRef.current);
        const tanZ = Math.cos(angleRef.current);
        const relVx = velRef.current.x - mars.velocity.x;
        const relVz = velRef.current.z - mars.velocity.z;
        const tangentialSpeed = relVx * tanX + relVz * tanZ;
        angularSpeedRef.current =
          orbitRadiusRef.current > 0
            ? tangentialSpeed / orbitRadiusRef.current
            : 0.1;

        yRef.current = 0;
        orbitLockedRef.current = true;
      }

      return;
    }

    // ── Phase 2: non-physical circular orbit + y descent ──
    angleRef.current += angularSpeedRef.current * delta;

    if (yRef.current > data.yTarget) {
      yRef.current = Math.max(data.yTarget, yRef.current - DESCENT_SPEED * delta);
    }

    const x = Math.cos(angleRef.current) * orbitRadiusRef.current;
    const z = Math.sin(angleRef.current) * orbitRadiusRef.current;

    groupRef.current.position.set(
      mars.position.x + x,
      mars.position.y + yRef.current,
      mars.position.z + z,
    );
  });

  // Always mount the group so groupRef is available for useFrame.
  // Starts hidden; useFrame sets visible=true when deployment data arrives.
  return (
    <group ref={groupRef} visible={false}>
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(CONTAINER_URL);
