import * as THREE from 'three';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { SUN_LIGHT_INTENSITY_BASE, SUN_LIGHT_DISTANCE_BASE, SUN_CORONA_OPACITY, SUN_CORONA_SCALE } from '../../config/sunConfig';

// Point light intensity scales with scale² (inverse square law):
// objects at 2× distance need 4× intensity to receive the same illumination.
// distance scales linearly with the solar system.
const S = SOLAR_SYSTEM_SCALE / 4; // ratio relative to authored baseline (scale=4)
const LIGHT_INTENSITY = SUN_LIGHT_INTENSITY_BASE * S * S;
const LIGHT_DISTANCE = SUN_LIGHT_DISTANCE_BASE * S;

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
        intensity={LIGHT_INTENSITY}
        distance={LIGHT_DISTANCE}
        decay={1.5}
      />
    </group>
  );
}
