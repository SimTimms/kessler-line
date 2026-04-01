import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RadioBeacon from './Radio/RadioBeacon';
import { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { type WorldObjectDef } from '../config/worldConfig';

export type OrbitingBeaconDef = WorldObjectDef & {
  orbit: {
    planetName: string;
    radius: number;
    speed: number;
    phase?: number;
  };
};

export function OrbitingRadioBeacon({
  def,
  beaconGroupRef,
  index,
  audioFile,
}: {
  def: OrbitingBeaconDef;
  beaconGroupRef?: { current: THREE.Group | null };
  index?: number;
  audioFile?: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const planetPos = solarPlanetPositions[def.orbit.planetName];
    if (!planetPos || !groupRef.current) return;

    const angle = (def.orbit.phase ?? 0) + clock.getElapsedTime() * def.orbit.speed;
    const orbitX = Math.cos(angle) * def.orbit.radius;
    const orbitZ = Math.sin(angle) * def.orbit.radius;
    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE + orbitX,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE + orbitZ
    );
  });

  return (
    <group ref={groupRef} position={def.position}>
      <RadioBeacon beaconGroupRef={beaconGroupRef} index={index} audioFile={audioFile} />
    </group>
  );
}
