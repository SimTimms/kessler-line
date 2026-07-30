import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import LaserRay from '../Combat/LaserRay';
import PlayerBullets from '../Combat/PlayerBullets';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import SolarSystem from '../Planets/SolarSystem';
import SunGravity from '../Environment/SunGravity';
import SpaceParticles from '../Environment/SpaceParticles';
import { FloatingOrigin } from '../Environment/FloatingOrigin';
import { SANDBOX_USE_FLOATING_ORIGIN } from '../../config/debugConfig';
import { GARBAGE_SCOW_MODULES } from '../../config/miningConfig';
import SalvageField from '../SalvageConfig/SalvageField';
import NormalTravelZoneRing from '../FastTravel/NormalTravelZoneRing';
import {
  getLtdNeptuneNormalTravelZoneRadius,
  getLtdNeptuneZoneCenter,
  getLtdSalvageFieldOrigin,
  getLtdShipSpawn,
  LONG_DISTANCE_TRAVEL_CONFIG,
  LTD_NEPTUNE_NORMAL_TRAVEL_ZONE_ID,
  LTD_NORMAL_TRAVEL_ZONE_ID,
  LTD_NORMAL_TRAVEL_ZONE_RADIUS,
  LTD_SALVAGE_ID_PREFIX,
} from './ltdSceneConfig';

const CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

export default function LongDistanceTravelConfigScene() {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const {
    fogColor,
    canvasNear,
    canvasFar,
    toneMappingExposure,
    solarSystemScale,
    tutorialFollowOffset,
    tutorialCameraZoomMax,
    planetImpactCameraHoldMaxAltitude,
    shipParticleCount,
    lighting,
  } = LONG_DISTANCE_TRAVEL_CONFIG;

  const shipSpawn = useMemo(() => getLtdShipSpawn(), []);
  const fieldOrigin = useMemo((): [number, number, number] => {
    const o = getLtdSalvageFieldOrigin();
    return [o.x, o.y, o.z];
  }, []);
  const neptuneZoneCenter = useMemo((): [number, number, number] => {
    const o = getLtdNeptuneZoneCenter();
    return [o.x, o.y, o.z];
  }, []);
  const neptuneZoneRadius = useMemo(() => getLtdNeptuneNormalTravelZoneRadius(), []);

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
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight
        position={lighting.keyLight.position}
        intensity={lighting.keyLight.intensity}
        color={lighting.keyLight.color}
      />
      <directionalLight
        position={lighting.fillLight.position}
        intensity={lighting.fillLight.intensity}
        color={lighting.fillLight.color}
      />
      <SpaceParticles />
      <Suspense fallback={null}>
        <Spaceship
          url="/shuttle-low-british.glb"
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
        <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
        <PlayerBullets shipGroupRef={spaceshipGroupRef} />
        <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />
        <SolarSystem scale={solarSystemScale} />
        {/* Static salvage pocket — does not orbit with Neptune. */}
        <SalvageField origin={fieldOrigin} idPrefix={LTD_SALVAGE_ID_PREFIX} debugJumpDockOnClick />
        {/* Inside outer ring = staged normal travel; outside = full fast travel. */}
        <NormalTravelZoneRing
          id={LTD_NORMAL_TRAVEL_ZONE_ID}
          center={fieldOrigin}
          radius={LTD_NORMAL_TRAVEL_ZONE_RADIUS}
        />
        {/* Broader slow zone around Neptune (static start pose; matches salvage field). */}
        <NormalTravelZoneRing
          id={LTD_NEPTUNE_NORMAL_TRAVEL_ZONE_ID}
          center={neptuneZoneCenter}
          radius={neptuneZoneRadius}
        />
      </Suspense>
    </>
  );

  return (
    <Canvas
      dpr={[1, 2]}
      style={{
        width: '100vw',
        height: '100vh',
        background: fogColor,
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
      <SunGravity />
      <SharedInteractionSceneTools />
      <ShipDepthOfField saturation={0} />
    </Canvas>
  );
}
