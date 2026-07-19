import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import DefaultLighting from '../DefaultLighting';
import LaserRay from '../Combat/LaserRay';
import PlayerBullets from '../Combat/PlayerBullets';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import SolarSystem from '../Planets/SolarSystem';
import SunGravity from '../Environment/SunGravity';
import SpaceParticles from '../Environment/SpaceParticles';
import { FloatingOrigin } from '../Environment/FloatingOrigin';
import { BodyOrbit } from '../BodyOrbit';
import {
  SANDBOX_ASTEROID_ORBIT,
  SANDBOX_ASTEROID_RADIO,
  SANDBOX_CONFIG,
  SANDBOX_BATTLESHIP_ORBIT,
} from './sandboxConfig';
import { Asteroid } from '../TutorialResources/Asteroid';
import { ASTEROID_DOCK_CONFIG } from '../../config/docks/asteroidDockConfig';
import { Station } from '../Station/Station';
import DustCloud from '../DustCloud/DustCloud';
import { getPlanetPosition } from '../../config/planetPosition';
import { SANDBOX_USE_FLOATING_ORIGIN } from '../../config/debugConfig';
import SandboxStarterMission from './SandboxStarterMission';
import GhostFleet from '../NPCs/GhostFleet';
import UBoat from '../UBoat/UBoat';
import { UBoatConfig } from '../ModelConfig/UBoatConfig';
/** Camera + post FX run after FloatingOrigin rebases the world (priority 3). */
const SANDBOX_CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

export default function SandboxScene() {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const {
    fogColor,
    lightColor,
    tutorialFollowOffset,
    canvasNear,
    canvasFar,
    toneMappingExposure,
    applySandboxSpawn,
    createSandboxSpawn,
    planetImpactCameraHoldMaxAltitude,
    tutorialCameraZoomMax,
    solarSystemScale,
    shipParticleCount,
  } = SANDBOX_CONFIG;

  const sandboxSpawn = useMemo(() => createSandboxSpawn(), [createSandboxSpawn]);

  useLayoutEffect(() => {
    applySandboxSpawn(sandboxSpawn, spaceshipGroupRef.current);
  }, [applySandboxSpawn, sandboxSpawn]);

  const marsPosition = getPlanetPosition('Mars');
  const dustPosition = new THREE.Vector3(marsPosition.x, -1000000, marsPosition.z);

  const worldContent = (
    <>
      <DefaultLighting
        color={lightColor}
        intensity={0.001}
        ambientIntensity={0.0002}
        position={[0, 0, -10000]}
      />
      <SpaceParticles />
      <Suspense fallback={null}>
        <Spaceship
          key={sandboxSpawn.presetId}
          url="/shuttle-low-british.glb"
          shipGroupRef={spaceshipGroupRef}
          initialPosition={sandboxSpawn.position}
          initialRotation={sandboxSpawn.rotation}
          scale={1}
          initialVelocity={sandboxSpawn.velocity}
          shipParticleCloudProps={{
            count: shipParticleCount,
            enableSpeedGate: true,
            speedGateMin: 100000,
            speedGateMax: 100000,
          }}
        />
        <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
        <PlayerBullets shipGroupRef={spaceshipGroupRef} />
        <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />
        <SolarSystem scale={solarSystemScale} />
        <GhostFleet />
      </Suspense>
      <BodyOrbit {...SANDBOX_ASTEROID_ORBIT}>
        <Asteroid
          scale={1000}
          radioBroadcast={SANDBOX_ASTEROID_RADIO}
          dock={ASTEROID_DOCK_CONFIG}
        />
      </BodyOrbit>
      <BodyOrbit {...SANDBOX_ASTEROID_ORBIT}>
        <Station scale={2000} radioBroadcast={SANDBOX_ASTEROID_RADIO} />
      </BodyOrbit>
      <group position={dustPosition}>
        <DustCloud
          yInitial={-100000}
          colors={[
            new THREE.Color('#448888'),
            new THREE.Color('#ccffff'),
            new THREE.Color('#000000'),
          ]}
          opacity={0.025}
        />
      </group>
      <BodyOrbit {...SANDBOX_BATTLESHIP_ORBIT}>
        <UBoat
          scale={UBoatConfig.targetScale}
          position={UBoatConfig.targetPosition}
          scan={UBoatConfig.targetScan}
          impactVents
          flyable
          initialFuel={100}
          dockingBay={{
            stationId: 'model-config-target',
            dimensions: [2, 1, 1.3],
            position: [
              -4 / (UBoatConfig.targetScale * 0.56),
              -0.8,
              1110 / (UBoatConfig.targetScale * 2.1),
            ],
            scale: 3,
            dock: ASTEROID_DOCK_CONFIG,
            debugDockOnClick: true,
          }}
        ></UBoat>
      </BodyOrbit>
    </>
  );

  return (
    <>
      <Canvas
        style={{
          width: '100vw',
          height: '100vh',
          background: SANDBOX_CONFIG.fogColor,
          touchAction: 'none',
        }}
        camera={{
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
        <SandboxStarterMission spawnPresetId={sandboxSpawn.presetId} />
        <TutorialFollowCamera
          followTarget={shipPosRef}
          followOffset={tutorialFollowOffset}
          zoomMax={tutorialCameraZoomMax}
          attachTo={spaceshipGroupRef}
          flattenBanking
          lockPolarAngle
          planetImpactCameraHoldMaxAltitude={planetImpactCameraHoldMaxAltitude}
          framePriority={SANDBOX_CAMERA_FRAME_PRIORITY}
        />
        {SANDBOX_USE_FLOATING_ORIGIN ? (
          <FloatingOrigin>{worldContent}</FloatingOrigin>
        ) : (
          worldContent
        )}
        <SunGravity />
        <SharedInteractionSceneTools />
        <ShipDepthOfField saturation={-0.1} />
      </Canvas>
    </>
  );
}
