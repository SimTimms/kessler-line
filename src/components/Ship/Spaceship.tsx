import { useRef, useCallback, useEffect } from 'react';
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
  MAIN_ENGINE_LOCAL_POS_A,
  MAIN_ENGINE_LOCAL_POS_B,
  RCS_THRUSTER_LOCAL,
  THRUSTER_LIGHT_COLOR,
  THRUSTER_LIGHT_DISTANCE,
  THRUSTER_LIGHT_DECAY,
} from '../../config/shipConfig';

/** Order must match `thrusterLight.ts` slot indices and `useShipPhysics` actives. */
const THRUSTER_LIGHT_SLOTS: { key: string; position: [number, number, number] }[] = [
  { key: 'reverseA', position: MAIN_ENGINE_LOCAL_POS_A },
  { key: 'reverseB', position: MAIN_ENGINE_LOCAL_POS_B },
  { key: 'rcsForward', position: RCS_THRUSTER_LOCAL.forwardLight },
  { key: 'rcsLeft', position: RCS_THRUSTER_LOCAL.leftLight },
  { key: 'rcsRight', position: RCS_THRUSTER_LOCAL.rightLight },
  { key: 'rcsStrafeL', position: RCS_THRUSTER_LOCAL.strafeLeftLight },
  { key: 'rcsStrafeR', position: RCS_THRUSTER_LOCAL.strafeRightLight },
];

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
  initialDockedTo?: string | null;
  enableShipExplosion?: boolean;
  shipParticleCloudProps?: Partial<ShipParticleCloudProps>;
  /** World-space velocity (units/s) once at spawn; gravity/thrust apply after. Y ignored (horizontal plane). Omit if starting docked. */
  initialVelocity?: [number, number, number];
}

export default function Spaceship({
  url,
  scale = 1,
  shipGroupRef,
  initialPosition,
  initialRotation,
  initialDockedTo,
  enableShipExplosion = false,
  shipParticleCloudProps,
  initialVelocity,
}: SpaceshipProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
      }
    });
  }, [gltf.scene]);
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
    thrusterLightRefs,
  } = useShipPhysics({ groupRef, dockingPortRef, initialDockedTo, initialVelocity });

  return (
    <>
      <group ref={setGroupRef} rotation={initialRotation ?? [0, 0, 0]} position={initialPosition}>
        <primitive
          object={gltf.scene}
          scale={scale}
          rotation={[0, Math.PI / 2, 0]}
          castShadow={true}
        />
        <group position={[0, -2, 0]}>
          <ThrusterHitboxDebug enabled={DEBUG_THRUSTER_HITBOXES} />
        </group>
        {/* Thruster point lights — one per main nozzle and RCS emitter (see ThrusterParticles). */}
        {THRUSTER_LIGHT_SLOTS.map(({ key, position }, index) => (
          <pointLight
            key={key}
            ref={(el) => {
              thrusterLightRefs.current[index] = el;
            }}
            position={position}
            color={THRUSTER_LIGHT_COLOR}
            distance={THRUSTER_LIGHT_DISTANCE}
            decay={THRUSTER_LIGHT_DECAY}
            intensity={0}
          />
        ))}
        {/* Docking port at ship nose — local +Z = forward direction of port */}
        <group ref={dockingPortRef} position={[0, -0.025, DOCKING_PORT_LOCAL_Z - 0.1]}>
          <mesh>
            <boxGeometry args={[1, 0.05, 0.4]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={2.4}
              metalness={0.15}
              roughness={0.35}
              depthWrite={false}
            />
          </mesh>
        </group>
        {/* Particles are children of the ship group so buffer coords stay in local space —
            avoids float32 precision jitter at large world coordinates. */}
        <ThrusterParticles
          shipGroupRef={groupRef}
          thrustForward={thrustForward}
          thrustReverse={thrustReverse}
          thrustLeft={thrustLeft}
          thrustRight={thrustRight}
          thrustStrafeLeft={thrustStrafeLeft}
          thrustStrafeRight={thrustStrafeRight}
        />
      </group>
      <group position={[0, 0, 9]}>
        <DockingReleaseParticles shipGroupRef={groupRef} triggerRef={releaseParticleTrigger} />
      </group>
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
