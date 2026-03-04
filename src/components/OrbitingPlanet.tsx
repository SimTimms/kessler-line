import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';

interface OrbitingPlanetProps {
  planetName: string;
  orbitRadius: number;
  radius: number;       // world-space sphere radius
  color: string;
  emissive?: string;
  orbitalSpeed: number; // rad/s
  spinSpeed: number;    // rad/s (negative = retrograde)
  axialTilt: number;    // radians
  initialAngle: number; // radians
  rings?: boolean;
}

export default function OrbitingPlanet({
  planetName,
  orbitRadius,
  radius,
  color,
  emissive = '#000000',
  orbitalSpeed,
  spinSpeed,
  axialTilt,
  initialAngle,
  rings = false,
}: OrbitingPlanetProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (orbitRef.current) orbitRef.current.rotation.y = initialAngle;
  }, [initialAngle]);

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += orbitalSpeed * delta;
      const θ = orbitRef.current.rotation.y;
      solarPlanetPositions[planetName] = {
        x: Math.cos(θ) * orbitRadius,
        z: -Math.sin(θ) * orbitRadius,
      };
    }
    if (spinRef.current) spinRef.current.rotation.y += spinSpeed * delta;
  });

  return (
    <group ref={orbitRef}>
      <group position={[orbitRadius, 0, 0]}>
        {/* Axial tilt applied once; spin group rotates around the tilted axis */}
        <group rotation-x={axialTilt}>
          <group ref={spinRef}>
            <mesh>
              <sphereGeometry args={[radius, 64, 64]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                roughness={0.8}
                fog={false}
              />
            </mesh>

            {rings && (
              <mesh rotation-x={Math.PI / 2}>
                <ringGeometry args={[radius * 1.4, radius * 2.3, 64]} />
                <meshStandardMaterial
                  color="#c2a878"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.75}
                  fog={false}
                />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}
