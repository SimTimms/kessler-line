import { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTutorialThrustersHighlighted } from '../TutorialMovement/useTutorialThrustersHighlighted';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import ThrusterParticles from './ThrusterParticles';
import ThrusterHitboxDebug from './ThrusterHitboxDebug';
import DockingReleaseParticles from '../WorldObjects/DockingReleaseParticles';
import ResourceVentParticles from './ResourceVentParticles';
import EjectedCrew from './EjectedCrew';
import ShipExplosion from './ShipExplosion';
import ShipParticleCloud, { type ShipParticleCloudProps } from './ShipParticleCloud';
import RailgunDamagePainter from './RailgunDamagePainter';
import RailgunOxygenVents from './RailgunOxygenVents';
import HullStressEffect from './HullStressEffect';
import HullBreachEffects from './HullBreachEffects';
import LowO2BreathingEffect from './LowO2BreathingEffect';
import ShipBreakApart from './ShipBreakApart';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { useShipPhysics, type ShipPhysicsOptions } from '../../hooks/shipPhysics';
import TargetIndicatorLine from '../TargetIndicatorLine';
import VelocityIndicator from '../VelocityIndicator';
import { SHIP_COLLISION_ID, DOCKING_PORT_LOCAL_Z } from '../../context/ShipState';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { setVesselModules } from '../../context/VesselStateStore';
import { DEBUG_THRUSTER_HITBOXES } from '../../config/debugConfig';
import { SHIP_BOX_HALF_EXTENTS } from '../../config/shipConfig';
import {
  THRUSTER_LIGHT_COLOR,
  THRUSTER_LIGHT_DECAY,
  THRUSTER_LIGHT_DISTANCE,
} from '../../config/thrusterConfig';
import PlanetSurfaceImpactDust from '../Environment/PlanetSurfaceImpactDust';
import ShipManeuverLean from './ShipManeuverLean';

/** Order must match `thrusterLight.ts` slot indices and `useShipPhysics` actives. */
const THRUSTER_LIGHT_SLOTS: { key: string; position: [number, number, number] }[] = [
  { key: 'reverseA', position: [0, 1, 18.5] },
  { key: 'reverseB', position: [0, 1, 18.5] },
  { key: 'rcsForward', position: [0, 1, -19] },
  { key: 'rcsLeft', position: [3, 1, -18] },
  { key: 'rcsRight', position: [-3, 1, -18] },
  { key: 'rcsStrafeL', position: [5, 1, -6] },
  { key: 'rcsStrafeR', position: [-5, 1, -6] },
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
  /** Rotation applied to the loaded GLB primitive (ship-local). */
  modelRotation?: [number, number, number];
  shipGroupRef?: { current: THREE.Group | null };
  initialPosition?: [number, number, number];
  initialRotation?: [number, number, number];
  initialDockedTo?: string | null;
  enableShipExplosion?: boolean;
  shipParticleCloudProps?: Partial<ShipParticleCloudProps>;
  /** World-space velocity (units/s) once at spawn; gravity/thrust apply after. Y ignored (horizontal plane). Omit if starting docked. */
  initialVelocity?: [number, number, number];
  /** Vessel state id used by reusable ship physics. */
  vesselId?: string;
  /** Collision registry id for this ship body. */
  collisionId?: string;
  /** Optional feature gates for reusable vessel physics behavior. */
  physicsOptions?: ShipPhysicsOptions;
  /** Ship tools / modules installed on this vessel (e.g. `"mining module"`). */
  modulesInstalled?: string[];
}

export default function Spaceship({
  url,
  scale = 1,
  modelRotation = [0, Math.PI / 2, 0],
  shipGroupRef,
  initialPosition,
  initialRotation,
  initialDockedTo,
  enableShipExplosion = false,
  shipParticleCloudProps,
  initialVelocity,
  vesselId = PLAYER_VESSEL_ID,
  collisionId = SHIP_COLLISION_ID,
  physicsOptions,
  modulesInstalled,
}: SpaceshipProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null!);
  const leanRef = useRef<THREE.Group>(null!);
  const shadowLightTarget = useRef(new THREE.Object3D());

  useEffect(() => {
    if (!modulesInstalled) return;
    setVesselModules(vesselId, modulesInstalled);
  }, [vesselId, modulesInstalled]);

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
          id: collisionId,
          getWorldPosition: (target) => {
            if (groupRef.current) groupRef.current.getWorldPosition(target);
            return target.set(target.x, target.y, target.z);
          },
          getWorldQuaternion: (target) => {
            if (groupRef.current) groupRef.current.getWorldQuaternion(target);
            return target;
          },
          shape: {
            type: 'box',
            halfExtents: new THREE.Vector3(...SHIP_BOX_HALF_EXTENTS),
          },
          getObject3D: () => groupRef.current,
        });
      } else {
        unregisterCollidable(collisionId);
      }
    },
    [collisionId, shipGroupRef]
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
  } = useShipPhysics({
    vesselId,
    selfCollisionId: collisionId,
    groupRef,
    dockingPortRef,
    initialDockedTo,
    initialVelocity,
    options: physicsOptions,
  });

  useLayoutEffect(() => {
    if (!initialPosition || !groupRef.current) return;
    groupRef.current.position.set(...initialPosition);
  }, [initialPosition]);

  const thrustersHighlighted = useTutorialThrustersHighlighted();

  return (
    <>
      <group ref={setGroupRef} rotation={initialRotation ?? [0, 0, 0]} position={initialPosition}>
        <ShipManeuverLean leanRef={leanRef} />
        {/* Visual lean only — docking port + physics stay on the level root. */}
        <group ref={leanRef}>
          <PlanetSurfaceImpactDust />

          <primitive object={gltf.scene} scale={scale} rotation={modelRotation} castShadow={true} />
          <group position={[0, -2, 0]}>
            <ThrusterHitboxDebug enabled={DEBUG_THRUSTER_HITBOXES} />
          </group>

          <spotLight
            position={[0, 500, 100]}
            target={shadowLightTarget.current}
            angle={Math.PI / 5}
            penumbra={0.4}
            intensity={50000}
            distance={1000}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-radius={8}
            shadow-camera-near={1}
            shadow-camera-far={400}
          />
          <primitive object={shadowLightTarget.current} position={[0, 0, 0]} />
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
          {/* Particles are children of the lean group so thruster trails follow the tilt. */}
          <ThrusterParticles
            thrustForward={thrustForward}
            thrustReverse={thrustReverse}
            thrustLeft={thrustLeft}
            thrustRight={thrustRight}
            thrustStrafeLeft={thrustStrafeLeft}
            thrustStrafeRight={thrustStrafeRight}
            thrustersHighlighted={thrustersHighlighted}
          />
        </group>
        {/* Docking port at ship nose — aligns to target bay origin when docked */}
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
      </group>
      <group position={[0, 0, 9]}>
        <DockingReleaseParticles shipGroupRef={groupRef} triggerRef={releaseParticleTrigger} />
      </group>
      <ResourceVentParticles shipGroupRef={groupRef} />
      <EjectedCrew shipGroupRef={groupRef} />
      <ShipParticleCloud shipGroupRef={groupRef} {...shipParticleCloudProps} />
      <RailgunDamagePainter shipGroupRef={groupRef} />
      <RailgunOxygenVents shipGroupRef={groupRef} />
      <HullStressEffect shipGroupRef={groupRef} />
      <HullBreachEffects shipGroupRef={groupRef} />
      <LowO2BreathingEffect />
      {enableShipExplosion && <ShipExplosion shipGroupRef={groupRef} />}
      {enableShipExplosion && <ShipBreakApart shipGroupRef={groupRef} />}
      <TargetIndicatorLine shipGroupRef={groupRef} />
      <VelocityIndicator shipGroupRef={groupRef} />
    </>
  );
}
