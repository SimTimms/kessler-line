import { useRef, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import ThrusterParticles from './ThrusterParticles';
import ThrusterHitboxDebug from './ThrusterHitboxDebug';
import DockingReleaseParticles from '../WorldObjects/DockingReleaseParticles';
import ShipExplosion from './ShipExplosion';
import ShipParticleCloud, { type ShipParticleCloudProps } from './ShipParticleCloud';
import RailgunDamagePainter from './RailgunDamagePainter';
import RailgunOxygenVents from './RailgunOxygenVents';
import HullStressEffect from './HullStressEffect';
import ShipBreakApart from './ShipBreakApart';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { useShipPhysics } from '../../hooks/shipPhysics';
import TargetIndicatorLine from '../TargetIndicatorLine';
import VelocityIndicator from '../VelocityIndicator';
import { SHIP_COLLISION_ID, DOCKING_PORT_LOCAL_Z } from '../../context/ShipState';
import { DEBUG_THRUSTER_HITBOXES } from '../../config/debugConfig';
import {
  THRUSTER_LIGHT_POSITION,
  THRUSTER_LIGHT_COLOR,
  THRUSTER_LIGHT_DISTANCE,
  THRUSTER_LIGHT_DECAY,
} from '../../config/shipConfig';

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
  getShipSpeedMps,
} from '../../context/ShipState';

interface SpaceshipProps {
  url: string;
  scale?: number;
  shipGroupRef?: { current: THREE.Group | null };
  initialPosition?: [number, number, number];
  initialRotation?: [number, number, number];
  enableShipExplosion?: boolean;
  shipParticleCloudProps?: Partial<ShipParticleCloudProps>;
}

export default function Spaceship({
  url,
  scale = 2,
  shipGroupRef,
  initialPosition,
  initialRotation,
  enableShipExplosion = false,
  shipParticleCloudProps,
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
  } = useShipPhysics({ groupRef, dockingPortRef });

  return (
    <>
      <group ref={setGroupRef} rotation={initialRotation ?? [0, 0, 0]} position={initialPosition}>
        <primitive object={gltf.scene} scale={scale} rotation={[0, Math.PI / 2, 0]} />
        <group position={[0, -2, 0]}>
          <ThrusterHitboxDebug enabled={DEBUG_THRUSTER_HITBOXES} />
        </group>
        {/* Thruster point light — rear of ship, activates when any thruster fires */}
        <pointLight
          ref={thrusterLightRef}
          position={THRUSTER_LIGHT_POSITION}
          color={THRUSTER_LIGHT_COLOR}
          intensity={0}
          distance={THRUSTER_LIGHT_DISTANCE}
          decay={THRUSTER_LIGHT_DECAY}
        />
        {/* Docking port at ship nose — local +Z = forward direction of port */}
        <group ref={dockingPortRef} position={[0, 0, DOCKING_PORT_LOCAL_Z]}>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.004}
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
      <ShipParticleCloud shipGroupRef={groupRef} {...shipParticleCloudProps} />
      <RailgunDamagePainter shipGroupRef={groupRef} />
      <RailgunOxygenVents shipGroupRef={groupRef} />
      <HullStressEffect shipGroupRef={groupRef} />
      {enableShipExplosion && <ShipExplosion shipGroupRef={groupRef} />}
      {enableShipExplosion && <ShipBreakApart shipGroupRef={groupRef} />}
      <TargetIndicatorLine shipGroupRef={groupRef} />
      <VelocityIndicator />
    </>
  );
}
