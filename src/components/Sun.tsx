import * as THREE from 'three';
import { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';

// Point light intensity scales with scale² (inverse square law):
// objects at 2× distance need 4× intensity to receive the same illumination.
// distance scales linearly with the solar system.
const S = SOLAR_SYSTEM_SCALE / 4; // ratio relative to authored baseline (scale=4)
const LIGHT_INTENSITY = 20_00_000 * S * S; // 20M at scale=4
const LIGHT_DISTANCE = 1_000_000 * S; // 200k at scale=4

interface SunProps {
  radius: number;
}

export default function Sun({ radius }: SunProps) {
  return (
    <group position={[0, 0, 0]}>
      {/* Blazing white-hot core */}
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color="#FFFDF0"
          emissive="#FFFFFF"
          emissiveIntensity={0.8}
          fog={false}
          toneMapped={true}
        />
      </mesh>

      {/* Inner corona — pale yellow halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.22, 32, 32]} />
        <meshStandardMaterial
          color="#FFF8D0"
          emissive="#FFF8D0"
          emissiveIntensity={0.9}
          transparent
          opacity={0.28}
          side={THREE.FrontSide}
          depthWrite={false}
          fog={false}
          toneMapped={true}
        />
      </mesh>

      {/* 
      <mesh>
        <sphereGeometry args={[radius * 1.7, 32, 32]} />
        <meshStandardMaterial
          color="#FFE88A"
          emissive="#FFE88A"
          emissiveIntensity={1.2}
          transparent
          opacity={0.07}
          side={THREE.FrontSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

  
      <sprite scale={[radius * 18, radius * 18, 1]}>
        <spriteMaterial
          map={godRayTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          fog={false}
          toneMapped={false}
        />
      </sprite>
      */}

      <pointLight
        color="#fff8e0"
        intensity={LIGHT_INTENSITY}
        distance={LIGHT_DISTANCE}
        decay={1.5}
      />
    </group>
  );
}
