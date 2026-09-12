import { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gravityBodies } from '../../context/GravityRegistry';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerPhysical, unregisterPhysical } from '../../context/PhysicalRegistry';
import { GRAVITATIONAL_CONSTANT } from '../../config/bodyPhysicsConfig';
import useSyncPhysicalBody from '../../hooks/useSyncPhysicalBody';

const NAV_PLANET_ID = 'nav-config-planet';
const NAV_PLANET_RADIUS = 900;
const NAV_PLANET_POSITION: [number, number, number] = [4800, -2000, -7600];
const NAV_PLANET_SOI = 9000;
const NAV_PLANET_ORBIT_ALT = 1600;
const NAV_PLANET_MASS = 10000;

interface GravityTestPlanetProps {
  planetId?: string;
  planetPosition?: [number, number, number];
  planetRadius?: number;
  planetSoi?: number;
  planetOrbitAlt?: number;
  planetColor?: string;
  planetMass?: number;
  planetInitialVelocity?: THREE.Vector3;
  planetTextureUrl?: string;
  planetSpin?: number;
  isAffectedByGravity?: boolean;
}

export default function GravityTestPlanet({
  planetId = NAV_PLANET_ID,
  planetPosition = NAV_PLANET_POSITION,
  planetRadius = NAV_PLANET_RADIUS,
  planetSoi = NAV_PLANET_SOI,
  planetOrbitAlt = NAV_PLANET_ORBIT_ALT,
  planetColor = '#ffffff',
  planetMass = NAV_PLANET_MASS,
  planetInitialVelocity = new THREE.Vector3(0, 0, 0),
  planetTextureUrl = '/textures/mars.jpg',
  planetSpin = 0.1,
  isAffectedByGravity = false,
}: GravityTestPlanetProps) {
  const planetMu = GRAVITATIONAL_CONSTANT * planetMass;
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const planetPos = useMemo(
    () => new THREE.Vector3(planetPosition[0], planetPosition[1], planetPosition[2]),
    [planetPosition]
  );

  useEffect(() => {
    gravityBodies.set(planetId, {
      position: planetPos,
      velocity: new THREE.Vector3(0, 0, 0),
      mu: planetMu,
      soiRadius: planetSoi,
      surfaceRadius: planetRadius,
      orbitAltitude: planetOrbitAlt,
    });

    registerCollidable({
      id: planetId,
      label: 'Navigation Test Planet',
      getWorldPosition: (target) => target.copy(planetPos),
      shape: { type: 'sphere', radius: planetRadius },
      planetSurfaceImpact: true,
      getObject3D: () => groupRef.current,
    });

    registerPhysical({
      id: planetId,
      initialPosition: planetPos,
      initialVelocity: planetInitialVelocity,
      position: planetPos,
      velocity: planetInitialVelocity.clone(),
      mass: planetMass,
    });

    return () => {
      gravityBodies.delete(planetId);
      unregisterCollidable(planetId);
      unregisterPhysical(planetId);
    };
  }, [planetId, planetPos, planetRadius, planetMu, planetSoi, planetOrbitAlt]);

  useSyncPhysicalBody({ id: planetId, ref: groupRef, isAffectedByGravity });

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += planetSpin * delta;
    }
  });

  const marsTexture = useTexture(planetTextureUrl);
  marsTexture.colorSpace = THREE.SRGBColorSpace;

  return (
    <group ref={groupRef} position={planetPosition}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[planetRadius, 64, 64]} />
        <meshStandardMaterial
          color={planetColor}
          map={marsTexture}
          emissive="#112244"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
