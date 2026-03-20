import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import EarthPlanet from './EarthPlanet';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';

// 1 Earth year = 30 real seconds
const ORBITAL_SPEED = (2 * Math.PI) / 30; // rad/s

interface OrbitingEarthProps {
  scale: number;
  orbitRadius: number;
}

export default function OrbitingEarth({ scale, orbitRadius }: OrbitingEarthProps) {
  const orbitRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Start at a different angle from Neptune
    if (orbitRef.current) orbitRef.current.rotation.y = 2.8;
  }, []);

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += ORBITAL_SPEED * delta;
      const θ = orbitRef.current.rotation.y;
      solarPlanetPositions['Earth'] = {
        x: Math.cos(θ) * orbitRadius,
        z: -Math.sin(θ) * orbitRadius,
      };
    }
  });

  return (
    <group ref={orbitRef}>
      <group position={[orbitRadius, 0, 0]}>
        {/* Axial tilt: 23.4°. EarthPlanet handles its own spin internally. */}
        <group rotation-x={23.4 * (Math.PI / 180)}>
          <EarthPlanet position={[0, 0, 0]} scale={scale} />
        </group>
      </group>
    </group>
  );
}
