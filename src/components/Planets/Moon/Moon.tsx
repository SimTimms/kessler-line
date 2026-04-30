import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gravityBodies } from '../../../context/GravityRegistry';
import { registerCollidable, unregisterCollidable } from '../../../context/CollisionRegistry';
import { SHIP_RADIUS, setHullIntegrity, shipDestroyed } from '../../../context/ShipState';
import { shipPosRef } from '../../../context/ShipPos';
import {
  MOON_BODY_ID,
  MOON_BUMP_MAP_URL,
  MOON_SOI_MULTIPLIER,
  MOON_SURFACE_GRAVITY,
  MOON_TEXTURE_URL,
  TUTORIAL_MOON_POSITION,
  TUTORIAL_MOON_RADIUS,
} from '../../../config/moonConfig';
import { ORBIT_ALTITUDE_MULTIPLIER } from '../../../config/solarConfig';

// ~27.3 Earth days per lunar day; same reference spin as SolarSystem Earth (0.04 rad/s = 1 game day).
const MOON_SPIN_SPEED = 0.04 / 27.3;
const MOON_COLLISION_ID = 'tutorial-moon-surface';

const _worldPos = new THREE.Vector3();

interface MoonProps {
  position?: [number, number, number];
  radius?: number;
}

export default function Moon({
  position = TUTORIAL_MOON_POSITION,
  radius = TUTORIAL_MOON_RADIUS,
}: MoonProps) {
  const rootRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const prevWorldPosRef = useRef(new THREE.Vector3());
  const hasPrevWorldPosRef = useRef(false);
  const [colorMap, bumpMap] = useTexture([MOON_TEXTURE_URL, MOON_BUMP_MAP_URL]);

  useLayoutEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    bumpMap.colorSpace = THREE.NoColorSpace;
  }, [colorMap, bumpMap]);

  const mu = MOON_SURFACE_GRAVITY * radius * radius;
  const soiRadius = radius * MOON_SOI_MULTIPLIER;
  const orbitAltitude = radius * ORBIT_ALTITUDE_MULTIPLIER;

  useEffect(() => {
    gravityBodies.set(MOON_BODY_ID, {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      mu,
      soiRadius,
      surfaceRadius: radius,
      orbitAltitude,
    });
    registerCollidable({
      id: MOON_COLLISION_ID,
      getWorldPosition: (target) => {
        if (rootRef.current) rootRef.current.getWorldPosition(target);
        return target;
      },
      shape: { type: 'sphere', radius },
      getObject3D: () => rootRef.current,
    });
    hasPrevWorldPosRef.current = false;
    return () => {
      gravityBodies.delete(MOON_BODY_ID);
      unregisterCollidable(MOON_COLLISION_ID);
    };
  }, [mu, orbitAltitude, radius, soiRadius]);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += MOON_SPIN_SPEED * delta;

    const body = gravityBodies.get(MOON_BODY_ID);
    if (!body || !rootRef.current) return;

    rootRef.current.getWorldPosition(_worldPos);
    if (hasPrevWorldPosRef.current && delta > 0) {
      body.velocity.subVectors(_worldPos, prevWorldPosRef.current).multiplyScalar(1 / delta);
    } else {
      body.velocity.set(0, 0, 0);
    }
    prevWorldPosRef.current.copy(_worldPos);
    hasPrevWorldPosRef.current = true;
    body.position.copy(_worldPos);

    // Hard-fail on moon contact: any hull intersection means destruction.
    if (!shipDestroyed.current) {
      const shipDist = _worldPos.distanceToSquared(shipPosRef.current);
      const minDist = radius + SHIP_RADIUS;
      if (shipDist <= minDist * minDist) {
        setHullIntegrity(0);
      }
    }
  });

  return (
    <group ref={rootRef} position={position}>
      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial
            color="#ffffff"
            map={colorMap}
            bumpMap={bumpMap}
            bumpScale={-0.045}
            roughness={0.92}
            metalness={0}
            emissive="#000000"
            fog={false}
          />
        </mesh>
      </group>
    </group>
  );
}
