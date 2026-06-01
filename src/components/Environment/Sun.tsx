import { useRef } from 'react';
import * as THREE from 'three';
import { SOLAR_SYSTEM_SCALE, SUN_WORLD_RADIUS } from '../../config/solarConfig';
import { SUN_LIGHT_INTENSITY_BASE, SUN_LIGHT_DISTANCE_BASE, SUN_CORONA_OPACITY, SUN_CORONA_SCALE } from '../../config/sunConfig';
import { useRegisterPlanetCollider } from '../../hooks/useRegisterPlanetCollider';

// Point light intensity scales with scale² (inverse square law):
// objects at 2× distance need 4× intensity to receive the same illumination.
// distance scales linearly with the solar system.
const S = SOLAR_SYSTEM_SCALE / 4; // ratio relative to authored baseline (scale=4)
const DEFAULT_LIGHT_INTENSITY = SUN_LIGHT_INTENSITY_BASE * S * S;
const DEFAULT_LIGHT_DISTANCE = SUN_LIGHT_DISTANCE_BASE * S;

interface SunProps {
  radius: number;
  /** Override point-light intensity (default scales with SOLAR_SYSTEM_SCALE). */
  lightIntensity?: number;
  lightDistance?: number;
}

export default function Sun({ radius, lightIntensity, lightDistance }: SunProps) {
  const centerRef = useRef<THREE.Group>(null);
  const intensity = lightIntensity ?? DEFAULT_LIGHT_INTENSITY;
  const distance = lightDistance ?? DEFAULT_LIGHT_DISTANCE;

  useRegisterPlanetCollider(centerRef, 'Sun', SUN_WORLD_RADIUS);

  return (
    <group ref={centerRef} position={[0, 0, 0]}>
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
        <sphereGeometry args={[radius * SUN_CORONA_SCALE, 32, 32]} />
        <meshStandardMaterial
          color="#FFF8D0"
          emissive="#FFF8D0"
          emissiveIntensity={0.9}
          transparent
          opacity={SUN_CORONA_OPACITY}
          side={THREE.FrontSide}
          depthWrite={false}
          fog={false}
          toneMapped={true}
        />
      </mesh>

      <pointLight
        color="#fff8e0"
        intensity={intensity}
        distance={distance}
        decay={1.5}
      />
    </group>
  );
}
