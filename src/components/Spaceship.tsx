import { useRef, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import ThrusterParticles from './ThrusterParticles';
import DockingReleaseParticles from './DockingReleaseParticles';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';
import { useShipPhysics } from '../hooks/useShipPhysics';
import { SHIP_COLLISION_ID, DOCKING_PORT_LOCAL_Z } from '../context/ShipState';

// Re-export everything consumers currently import from this file
export {
  THRUST,
  SHIP_RADIUS,
  power,
  hullIntegrity,
  fuel,
  o2,
  shipVelocity,
  shipAcceleration,
  shipQuaternion,
  isRefueling,
  isTransferringO2,
  thrustMultiplier,
  shipDestroyed,
  drainPower,
  damageHull,
} from '../context/ShipState';

interface SpaceshipProps {
  url: string;
  scale?: number;
  positionRef?: { current: THREE.Vector3 };
  shipGroupRef?: { current: THREE.Group | null };
  initialPosition?: [number, number, number];
}

export default function Spaceship({
  url,
  scale = 1,
  positionRef,
  shipGroupRef,
  initialPosition,
}: SpaceshipProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null!);
  const dockingPortRef = useRef<THREE.Group>(null!);

  const setGroupRef = useCallback(
    (el: THREE.Group | null) => {
      groupRef.current = el!;
      if (shipGroupRef) shipGroupRef.current = el;
      if (el) {
        registerCollidable({
          id: SHIP_COLLISION_ID,
          getWorldPosition: (target) => {
            if (groupRef.current) groupRef.current.getWorldPosition(target);
            return target;
          },
          shape: { type: 'box', halfExtents: new THREE.Vector3(9, 3, 10) },
        });
      } else {
        unregisterCollidable(SHIP_COLLISION_ID);
      }
    },
    [shipGroupRef]
  );

  const {
    thrustForward,
    thrustReverse,
    thrustLeft,
    thrustRight,
    thrustStrafeLeft,
    thrustStrafeRight,
    releaseParticleTrigger,
    thrusterLightRef,
  } = useShipPhysics({ groupRef, dockingPortRef, positionRef });

  return (
    <>
      <group ref={setGroupRef} rotation={[0, 0, 0]} position={initialPosition}>
        <primitive object={gltf.scene} scale={scale} />
        {/* Thruster point light — rear of ship, activates when any thruster fires */}
        <pointLight
          ref={thrusterLightRef}
          position={[0, 0, -10]}
          color="#88ccff"
          intensity={0}
          distance={40}
          decay={2}
        />
        {/* Docking port at ship nose — local +Z = forward direction of port */}
        <group ref={dockingPortRef} position={[0, 0, DOCKING_PORT_LOCAL_Z]}>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={0.4}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
      <group position={[0, 0, 9]}>
        <DockingReleaseParticles shipGroupRef={groupRef} triggerRef={releaseParticleTrigger} />
      </group>
      <ThrusterParticles
        shipGroupRef={groupRef}
        thrustForward={thrustForward}
        thrustReverse={thrustReverse}
        thrustLeft={thrustLeft}
        thrustRight={thrustRight}
        thrustStrafeLeft={thrustStrafeLeft}
        thrustStrafeRight={thrustStrafeRight}
      />
    </>
  );
}
