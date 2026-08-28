import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { gravityBodies } from '../../../context/GravityRegistry';
import { deployedSatelliteRef } from '../../../context/DeployedSatelliteState';
import { NARRATIVE_CONFIG } from '../../../scenes/NarrativeConfig/narrativeSceneConfig';
import { stepOrbit } from '../../../physics';
import type { OrbitState } from '../../../physics';

const CONTAINER_URL = '/satellite.glb';

/** How long the satellite keeps real physics after release (seconds). */
const PHYSICS_DURATION = 30;

/** Descent speed on the y-axis once orbit is locked (units/s). */
const DESCENT_SPEED = 10;

export default function DeployedSatellite() {
  const { scene: modelScene } = useGLTF(CONTAINER_URL);
  const groupRef = useRef<THREE.Group>(null);

  // ── Phase 1 (physics) state ──
  const orbitStateRef = useRef<OrbitState | null>(null);
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
    if (!orbitStateRef.current) {
      orbitStateRef.current = {
        position: new THREE.Vector3(data.releaseX, mars.position.y, data.releaseZ),
        velocity: new THREE.Vector3(data.releaseVelX, 0, data.releaseVelZ),
        primaryBodyId: 'Mars',
        primaryBodyVelocity: mars.velocity.clone(),
      };
      // Add Mars velocity to match ship's reference frame
      orbitStateRef.current.velocity.add(mars.velocity);
      timerRef.current = 0;
      orbitLockedRef.current = false;
      yRef.current = 0;
    }

    const state = orbitStateRef.current;

    // ── Phase 1: physics with gravity ──
    if (!orbitLockedRef.current) {
      timerRef.current += delta;

      stepOrbit(state, delta);
      state.position.addScaledVector(state.velocity, delta);

      // Keep on the orbital plane
      state.position.y = mars.position.y;

      groupRef.current.position.copy(state.position);

      // Transition to Phase 2 after PHYSICS_DURATION
      if (timerRef.current >= PHYSICS_DURATION) {
        const relX = state.position.x - mars.position.x;
        const relZ = state.position.z - mars.position.z;
        orbitRadiusRef.current = Math.sqrt(relX * relX + relZ * relZ);
        angleRef.current = Math.atan2(relZ, relX);

        // Tangential speed → angular speed for circular orbit lock
        const tanX = -Math.sin(angleRef.current);
        const tanZ = Math.cos(angleRef.current);
        const relVx = state.velocity.x - mars.velocity.x;
        const relVz = state.velocity.z - mars.velocity.z;
        const tangentialSpeed = relVx * tanX + relVz * tanZ;
        angularSpeedRef.current =
          orbitRadiusRef.current > 0 ? tangentialSpeed / orbitRadiusRef.current : 0.1;

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
      mars.position.z + z
    );
  });

  const { satelliteMissionConfig } = NARRATIVE_CONFIG;

  return (
    <group ref={groupRef} visible={false} scale={satelliteMissionConfig.scale}>
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(CONTAINER_URL);
