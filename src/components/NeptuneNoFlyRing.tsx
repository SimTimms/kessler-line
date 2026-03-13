import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE, PLANETS } from './SolarSystem';
import { neptuneNoFlyZoneActive } from '../context/CinematicState';

const SAFE_RING_COLOR = '#00ff6a';
const NO_FLY_COLOR = '#ff3344';

export default function NeptuneNoFlyRing() {
  const groupRef = useRef<THREE.Group>(null!);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null!);
  const labelRef = useRef<HTMLDivElement>(null);
  const neptune = PLANETS.find((planet) => planet.name === 'Neptune');
  const ringRadius = (neptune?.radius ?? 150) * SOLAR_SYSTEM_SCALE * 3.0;

  useFrame(() => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos || !groupRef.current || !ringMaterial.current) return;

    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE
    );

    const isNoFly = neptuneNoFlyZoneActive.current;
    ringMaterial.current.color.set(isNoFly ? NO_FLY_COLOR : SAFE_RING_COLOR);
    if (labelRef.current) {
      labelRef.current.style.opacity = isNoFly ? '1' : '0';
    }
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[ringRadius * 0.96, ringRadius * 1.04, 180]} />
        <meshBasicMaterial
          ref={ringMaterial}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html position={[0, 0, ringRadius + 220]} transform>
        <div ref={labelRef} className="no-fly-label">
          NO FLY ZONE
        </div>
      </Html>
    </group>
  );
}
