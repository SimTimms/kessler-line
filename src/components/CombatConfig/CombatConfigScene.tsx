import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import DefaultLighting from '../DefaultLighting';
import LaserRay from '../Combat/LaserRay';
import PlayerBullets from '../Combat/PlayerBullets';
import PlayerCannonHitDamage from '../Combat/PlayerCannonHitDamage';
import BreakupVfx from '../Combat/BreakupVfx';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import SpaceParticles from '../Environment/SpaceParticles';
import { FloatingOrigin } from '../Environment/FloatingOrigin';
import { SANDBOX_USE_FLOATING_ORIGIN } from '../../config/debugConfig';
import { GARBAGE_SCOW_MODULES } from '../../config/miningConfig';
import Asteroid from '../Asteroid/Asteroid';
import DustCloud from '../DustCloud/DustCloud';
import GarbageScowDroneFleet from '../NPCs/GarbageScowDroneFleet';
import NpcFighter from '../NPCs/NpcFighter';
import { COMBAT_CONFIG, COMBAT_ID_PREFIX, getCombatShipSpawn } from './combatSceneConfig';
import { CANVAS_FOV } from '../../config/visualConfig';

const CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

export default function CombatConfigScene() {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const {
    fogColor,
    canvasNear,
    canvasFar,
    toneMappingExposure,
    tutorialFollowOffset,
    tutorialCameraZoomMax,
    planetImpactCameraHoldMaxAltitude,
    shipParticleCount,
    playerShipUrl,
    dustCloud,
    mineableAsteroids,
    targetDroneFleet,
    hostileFighter,
  } = COMBAT_CONFIG;

  const shipSpawn = useMemo(() => getCombatShipSpawn(), []);

  useLayoutEffect(() => {
    shipPosRef.current.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    minimapShipPosition.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    const group = spaceshipGroupRef.current;
    if (group) {
      group.position.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
      group.rotation.set(shipSpawn.rotation[0], shipSpawn.rotation[1], shipSpawn.rotation[2]);
    }
  }, [shipSpawn]);

  const worldContent = (
    <>
      <DefaultLighting
        color="#ffffff"
        intensity={4.4}
        ambientIntensity={1.3}
        position={[10000, 10000, -100]}
      />
      <SpaceParticles />
      <Suspense fallback={null}>
        <Spaceship
          url={playerShipUrl}
          shipGroupRef={spaceshipGroupRef}
          initialPosition={shipSpawn.position}
          initialRotation={shipSpawn.rotation}
          scale={1}
          initialVelocity={[0, 0, 0]}
          modulesInstalled={GARBAGE_SCOW_MODULES}
          shipParticleCloudProps={{
            count: shipParticleCount,
            enableSpeedGate: true,
            speedGateMin: 100000,
            speedGateMax: 100000,
          }}
          physicsOptions={{
            enabled: true,
            inputEnabled: true,
            thrusterPhysicsEnabled: true,
            orbitalPhysicsEnabled: true,
            dockingPhysicsEnabled: true,
          }}
        />
        <LaserRay shipGroupRef={spaceshipGroupRef} />
        <PlayerBullets shipGroupRef={spaceshipGroupRef} />
        <PlayerCannonHitDamage />
        <BreakupVfx />
        <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />

        <NpcFighter
          id={`${COMBAT_ID_PREFIX}${hostileFighter.id}`}
          url={hostileFighter.url}
          position={hostileFighter.position}
          rotation={hostileFighter.rotation}
          scale={hostileFighter.scale}
        />

        {mineableAsteroids.map((asteroid) => (
          <Asteroid
            key={`${COMBAT_ID_PREFIX}${asteroid.id}`}
            position={asteroid.position}
            rotation={asteroid.rotation}
            scale={asteroid.scale}
            mineableId={`${COMBAT_ID_PREFIX}${asteroid.id}`}
            label={asteroid.label}
          />
        ))}

        <GarbageScowDroneFleet
          url={targetDroneFleet.url}
          count={targetDroneFleet.count}
          scale={targetDroneFleet.scale}
          spawnCenter={targetDroneFleet.spawnCenter}
          spawnRadius={targetDroneFleet.spawnRadius}
          waypoints={targetDroneFleet.waypoints}
          idPrefix={`${COMBAT_ID_PREFIX}drone`}
          registerCollision
          collisionRadius={targetDroneFleet.collisionRadius}
          physicalCollision
        />
      </Suspense>

      <Suspense fallback={null}>
        <DustCloud
          radius={dustCloud.radius}
          particleSize={dustCloud.particleSize}
          radialSpread={dustCloud.radialSpread}
          yInitial={dustCloud.yInitial}
          opacity={dustCloud.opacity}
          colors={[...dustCloud.colors]}
        />
      </Suspense>
    </>
  );

  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        background: fogColor,
        touchAction: 'none',
      }}
      camera={{
        fov: CANVAS_FOV,
        position: [...tutorialFollowOffset],
        near: canvasNear,
        far: canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure,
      }}
      shadows={true}
    >
      <fogExp2 attach="fog" args={[fogColor, 0.0000005]} />
      <TutorialFollowCamera
        followTarget={shipPosRef}
        followOffset={tutorialFollowOffset}
        zoomMax={tutorialCameraZoomMax}
        attachTo={spaceshipGroupRef}
        flattenBanking
        lockPolarAngle
        planetImpactCameraHoldMaxAltitude={planetImpactCameraHoldMaxAltitude}
        framePriority={CAMERA_FRAME_PRIORITY}
      />
      {SANDBOX_USE_FLOATING_ORIGIN ? <FloatingOrigin>{worldContent}</FloatingOrigin> : worldContent}
      <SharedInteractionSceneTools />
      <ShipDepthOfField saturation={0} />
    </Canvas>
  );
}
