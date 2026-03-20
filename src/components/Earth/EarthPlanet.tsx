import { useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EarthPlanetProps {
  position?: [number, number, number];
  scale?: number;
}

export default function EarthPlanet({ position = [0, 0, 0], scale = 55 }: EarthPlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useTexture('/earth.jpg');

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      {/* Thin atmosphere haze */}
      <mesh>
        <sphereGeometry args={[1.025, 32, 32]} />
        <meshStandardMaterial
          color={0x3366ff}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
