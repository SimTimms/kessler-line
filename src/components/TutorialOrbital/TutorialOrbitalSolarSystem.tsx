import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Sun from '../Environment/Sun';
import LunarTutorial from '../LunarTutorial/LunarTutorial';
import { gravityBodies } from '../../context/GravityRegistry';
import { MOON_BODY_ID, MOON_SOI_MULTIPLIER, MOON_SURFACE_GRAVITY } from '../../config/moonConfig';
import { LUNAR_MOON_RADIUS } from '../../config/lunarLandscapeConfig';
import {
  TUTORIAL_ORBITAL_IDEAL_ORBIT_ALTITUDE,
  TUTORIAL_ORBITAL_SUN_LIGHT_DISTANCE,
  TUTORIAL_ORBITAL_SUN_LIGHT_INTENSITY,
  TUTORIAL_ORBITAL_SUN_ORBIT_RADIUS,
  TUTORIAL_ORBITAL_SUN_ORBIT_SPEED,
  TUTORIAL_ORBITAL_SUN_RADIUS,
} from '../../config/tutorialOrbitalConfig';
import { tutorialOrbitalSolPosRef } from '../../config/tutorialOrbitalNavTargets';
import { useRegisterPlanetCollider } from '../../hooks/useRegisterPlanetCollider';

const SUN_COLLIDER_ID = 'tutorial-sun';

const _worldPos = new THREE.Vector3();
const _prevWorldPos = new THREE.Vector3();
const _sunWorldPos = new THREE.Vector3();

interface Props {
  children?: ReactNode;
}

/** Moon at origin; sun orbits; environment is not inside ship Suspense. */
export default function TutorialOrbitalSolarSystem({ children }: Props) {
  const sunOrbitRef = useRef<THREE.Group>(null);
  const sunAnchorRef = useRef<THREE.Group>(null);
  const lunarRootRef = useRef<THREE.Group>(null);
  const hasMoonPrevPosRef = useRef(false);

  const moonMu = MOON_SURFACE_GRAVITY * LUNAR_MOON_RADIUS * LUNAR_MOON_RADIUS;
  const moonSoiRadius = LUNAR_MOON_RADIUS * MOON_SOI_MULTIPLIER;
  const moonOrbitAltitude = TUTORIAL_ORBITAL_IDEAL_ORBIT_ALTITUDE;

  useRegisterPlanetCollider(sunAnchorRef, SUN_COLLIDER_ID, TUTORIAL_ORBITAL_SUN_RADIUS);

  useEffect(() => {
    gravityBodies.set(MOON_BODY_ID, {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      mu: moonMu,
      soiRadius: moonSoiRadius,
      surfaceRadius: LUNAR_MOON_RADIUS,
      orbitAltitude: moonOrbitAltitude,
    });

    hasMoonPrevPosRef.current = false;
    return () => {
      gravityBodies.delete(MOON_BODY_ID);
    };
  }, [moonMu, moonOrbitAltitude, moonSoiRadius]);

  useFrame(({ clock }, delta) => {
    if (sunOrbitRef.current) {
      // Start opposite the ship (+X spawn) so the Moon stays the primary gravity body.
      const angle = Math.PI + clock.getElapsedTime() * TUTORIAL_ORBITAL_SUN_ORBIT_SPEED;
      sunOrbitRef.current.position.set(
        Math.cos(angle) * TUTORIAL_ORBITAL_SUN_ORBIT_RADIUS,
        0,
        -Math.sin(angle) * TUTORIAL_ORBITAL_SUN_ORBIT_RADIUS
      );
    }

    if (sunAnchorRef.current) {
      sunAnchorRef.current.getWorldPosition(_sunWorldPos);
      tutorialOrbitalSolPosRef.current.copy(_sunWorldPos);
    }

    const moonBody = gravityBodies.get(MOON_BODY_ID);
    if (!moonBody || !lunarRootRef.current) return;

    lunarRootRef.current.getWorldPosition(_worldPos);
    if (hasMoonPrevPosRef.current && delta > 0) {
      moonBody.velocity.subVectors(_worldPos, _prevWorldPos).multiplyScalar(1 / delta);
    } else {
      moonBody.velocity.set(0, 0, 0);
    }
    _prevWorldPos.copy(_worldPos);
    hasMoonPrevPosRef.current = true;
    moonBody.position.copy(_worldPos);
  });

  return (
    <>
      <group ref={sunOrbitRef} position={[-TUTORIAL_ORBITAL_SUN_ORBIT_RADIUS, 0, 0]}>
        <group ref={sunAnchorRef}>
          <Sun
            radius={TUTORIAL_ORBITAL_SUN_RADIUS}
            lightIntensity={TUTORIAL_ORBITAL_SUN_LIGHT_INTENSITY}
            lightDistance={TUTORIAL_ORBITAL_SUN_LIGHT_DISTANCE}
          />
        </group>
      </group>
      <group ref={lunarRootRef}>
        <LunarTutorial />
        {children}
      </group>
    </>
  );
}
