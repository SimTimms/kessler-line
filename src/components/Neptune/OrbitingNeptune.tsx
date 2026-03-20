import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Neptune from './Neptune';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';

// Orbital time scale: 1 Earth year = 30 real seconds
// Neptune year = 164.8 Earth years → one orbit every ~4944 real seconds
const ORBITAL_SPEED = (2 * Math.PI) / (164.8 * 30); // rad/s

// Spin is kept on a separate, visually readable scale.
// EarthPlanet spins at 0.04 rad/s; Neptune day = 0.67 Earth days → spins slightly faster.
const SPIN_SPEED = 0.04 / 0.67; // rad/s

interface OrbitingNeptuneProps {
  scale: number;
  orbitRadius: number;
}

export default function OrbitingNeptune({ scale, orbitRadius }: OrbitingNeptuneProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (orbitRef.current) orbitRef.current.rotation.y = 1.2;
  }, []);

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += ORBITAL_SPEED * delta;
      const θ = orbitRef.current.rotation.y;
      solarPlanetPositions['Neptune'] = {
        x: Math.cos(θ) * orbitRadius,
        z: -Math.sin(θ) * orbitRadius,
      };
    }
    if (spinRef.current) spinRef.current.rotation.y += SPIN_SPEED * delta;
  });

  return (
    <group ref={orbitRef}>
      <group position={[orbitRadius, 0, 0]}>
        <group ref={spinRef} rotation-x={28.3 * (Math.PI / 180)}>
          <Neptune position={[0, 0, 0]} scale={scale} color={0xaabbff} />
        </group>
      </group>
    </group>
  );
}
