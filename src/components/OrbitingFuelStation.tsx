import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import {
  solarPlanetPositions,
  fuelStationWorldPos,
  fuelStationWorldVel,
} from '../context/SolarSystemMinimap';
import { navTargetIdRef, navTargetPosRef } from '../context/NavTarget';
import FuelStation from './WorldObjects/FuelStation';
import { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';

export function OrbitingFuelStation({
  orbitRadius,
  orbitSpeed,
  phase = 0,
  stationGroupRef,
}: {
  orbitRadius: number;
  orbitSpeed: number;
  phase?: number;
  stationGroupRef?: { current: THREE.Group | null };
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos || !groupRef.current) return;

    const angle = phase + clock.getElapsedTime() * orbitSpeed;
    const orbitX = Math.cos(angle) * orbitRadius;
    const orbitZ = Math.sin(angle) * orbitRadius;
    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE + orbitX,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE + orbitZ
    );

    fuelStationWorldPos.x = groupRef.current.position.x;
    fuelStationWorldPos.z = groupRef.current.position.z;

    // Analytical velocity: derivative of (cos(angle)*r, sin(angle)*r) w.r.t. time
    fuelStationWorldVel.x = -Math.sin(angle) * orbitRadius * orbitSpeed;
    fuelStationWorldVel.z = Math.cos(angle) * orbitRadius * orbitSpeed;

    if (navTargetIdRef.current === 'fuel-station') {
      navTargetPosRef.current.copy(groupRef.current.position);
    }
  });

  return (
    <group ref={groupRef}>
      <FuelStation
        url="/fuel-station.glb"
        scale={1}
        collisionRadius={25}
        stationGroupRef={stationGroupRef}
      />
    </group>
  );
}
