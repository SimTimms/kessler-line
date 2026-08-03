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
import PlayerCannonHitDamage from '../Combat/PlayerCannonHitDamage';
import BreakupVfx from '../Combat/BreakupVfx';
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
import CargoContainer from '../CargoContainer/CargoContainer';
import { CARGO_CONTAINER_DOCK } from '../../config/docks/cargoContainerDockConfig';
import {
  getNarrativeMarsNormalTravelRadius,
  getNarrativeMarsZoneCenter,
  getNarrativePrimaryFieldOrigin,
  getNarrativeSecondaryFieldOrigin,
  getNarrativeShipSpawn,
  NARRATIVE_CONFIG,
  NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS,
  NARRATIVE_MARS_ZONE_ID,
  NARRATIVE_PRIMARY_FIELD_ID_PREFIX,
  NARRATIVE_PRIMARY_ZONE_ID,
  NARRATIVE_SECONDARY_FIELD_ID_PREFIX,
  NARRATIVE_SECONDARY_ZONE_ID,
} from './narrativeSceneConfig';
import {
  BAKERFIELD_FALLS_DOCK_CONFIG,
  DONINGTON_STATION_DOCK_CONFIG,
} from '../../config/docks/narrativeDockConfig';

const CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

export default function NarrativeConfigScene() {
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
    extraContainersLocalToPrimaryField,
  } = NARRATIVE_CONFIG;

  const shipSpawn = useMemo(() => getNarrativeShipSpawn(), []);
  const primaryFieldOrigin = useMemo((): [number, number, number] => {
    const o = getNarrativePrimaryFieldOrigin();
    return [o.x, o.y, o.z];
  }, []);
  const secondaryFieldOrigin = useMemo((): [number, number, number] => {
    const o = getNarrativeSecondaryFieldOrigin();
    return [o.x, o.y, o.z];
  }, []);
  const marsZoneCenter = useMemo((): [number, number, number] => {
    const o = getNarrativeMarsZoneCenter();
    return [o.x, o.y, o.z];
  }, []);
  const marsZoneRadius = useMemo(() => getNarrativeMarsNormalTravelRadius(), []);

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
      <directionalLight position={[0, 100, -1000]} intensity={3} color="red" />
      <directionalLight position={[0, 1000, 1000]} intensity={3} color="white" />
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
        <PlayerCannonHitDamage />
        <BreakupVfx />
        <SolarSystem scale={solarSystemScale} />
        <SalvageField
          origin={primaryFieldOrigin}
          idPrefix={NARRATIVE_PRIMARY_FIELD_ID_PREFIX}
          debugJumpDockOnClick
          showDroneFleet={false}
          dockLabelOverride="Donington Station"
          dockConfigOverride={DONINGTON_STATION_DOCK_CONFIG}
          dockRadioBroadcastEnabled
          dockRadioDialogue={[
            'DONINGTON STATION BROADCASTING.',
            'DOCKMASTER BILL CHURCHILL AVAILABLE FOR PARCEL HANDOFF.',
          ]}
          dockRadioDockingBay="A1"
        />

        <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />

        <group position={primaryFieldOrigin} name="narrative-primary-field-cargo-containers">
          {extraContainersLocalToPrimaryField.map((container) => (
            <CargoContainer
              key={`${NARRATIVE_PRIMARY_FIELD_ID_PREFIX}${container.id}`}
              id={`${NARRATIVE_PRIMARY_FIELD_ID_PREFIX}${container.id}`}
              label={container.label}
              position={container.position}
              rotation={container.rotation}
              scale={container.scale}
              dock={CARGO_CONTAINER_DOCK}
              showCaptureMesh
              debugJumpDockOnClick
            />
          ))}
        </group>

        <SalvageField
          origin={secondaryFieldOrigin}
          idPrefix={NARRATIVE_SECONDARY_FIELD_ID_PREFIX}
          debugJumpDockOnClick
          showDroneFleet={false}
          showDroneAtmosphere
          dockLabelOverride="Bakerfield Falls"
          dockConfigOverride={BAKERFIELD_FALLS_DOCK_CONFIG}
          dockRadioBroadcastEnabled
          dockRadioDialogue={[
            'BAKERFIELD FALLS BROADCASTING.',
            'DOCKMASTER HANK JOHNSON STANDING BY FOR PARCEL RECEIPT.',
          ]}
          dockRadioDockingBay="B1"
        />
        <NormalTravelZoneRing
          id={NARRATIVE_PRIMARY_ZONE_ID}
          center={primaryFieldOrigin}
          radius={NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS}
        />
        <NormalTravelZoneRing
          id={NARRATIVE_SECONDARY_ZONE_ID}
          center={secondaryFieldOrigin}
          radius={NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS}
        />
        <NormalTravelZoneRing
          id={NARRATIVE_MARS_ZONE_ID}
          center={marsZoneCenter}
          radius={marsZoneRadius}
        />
      </Suspense>
    </>
  );

  return (
    <Canvas
      dpr={[1, 1.5]}
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
