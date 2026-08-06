/**
 * DeployedSatellite — renders the deployed satellite after the Elias Voss mission.
 *
 * Always mounts its group (hidden initially). When deployedSatelliteRef is populated
 * by the mission controller, the useFrame loop makes the group visible and drives
 * continuous circular orbit around Mars while descending on the y-axis.
 *
 * The satellite orbits at angularSpeed from the very first frame — there is no
 * separate "linear velocity" phase, so it stays in sync with the orbital path.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gravityBodies } from '../../context/GravityRegistry';
import { deployedSatelliteRef } from '../../context/DeployedSatelliteState';

/** Descent speed on the y-axis (units/s). */
const DESCENT_SPEED = 5;

export default function DeployedSatellite() {
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);
  const yRef = useRef(0);
  const initializedRef = useRef(false);

  useFrame((_, delta) => {
    const data = deployedSatelliteRef.current;
    if (!data || !data.deployed || !groupRef.current) return;

    // Make visible on first frame with deployment data
    if (!groupRef.current.visible) groupRef.current.visible = true;

    if (!initializedRef.current) {
      angleRef.current = data.initialAngle;
      yRef.current = 0;
      initializedRef.current = true;
    }

    const mars = gravityBodies.get('Mars');
    if (!mars) return;

    // Advance orbit angle every frame — keeps satellite moving with the orbital path
    angleRef.current += data.angularSpeed * delta;

    // Descend on y-axis until target reached
    if (yRef.current > data.yTarget) {
      yRef.current = Math.max(data.yTarget, yRef.current - DESCENT_SPEED * delta);
    }

    const x = Math.cos(angleRef.current) * data.orbitRadius;
    const z = Math.sin(angleRef.current) * data.orbitRadius;

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
      {/* Body */}
      <mesh>
        <boxGeometry args={[5, 2.5, 5]} />
        <meshStandardMaterial
          color="#aaaaaa"
          metalness={0.85}
          roughness={0.25}
          emissive="#111111"
          fog={false}
        />
      </mesh>
      {/* Port solar panel */}
      <mesh position={[11, 0, 0]}>
        <boxGeometry args={[13, 0.4, 4.5]} />
        <meshStandardMaterial
          color="#334499"
          metalness={0.7}
          roughness={0.3}
          emissive="#001144"
          fog={false}
        />
      </mesh>
      {/* Starboard solar panel */}
      <mesh position={[-11, 0, 0]}>
        <boxGeometry args={[13, 0.4, 4.5]} />
        <meshStandardMaterial
          color="#334499"
          metalness={0.7}
          roughness={0.3}
          emissive="#001144"
          fog={false}
        />
      </mesh>
      {/* Dish antenna */}
      <mesh position={[0, 2.5, 0]} rotation-x={Math.PI / 4}>
        <cylinderGeometry args={[2, 0.2, 2, 12]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} fog={false} />
      </mesh>
    </group>
  );
}
