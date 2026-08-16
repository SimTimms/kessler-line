import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import Spaceship from '../../components/Ship/Spaceship';
import TutorialFollowCamera from '../../components/TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../../components/TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import DeployedSatellite from '../../config/events/satellite-mission/DeployedSatellite';
import LaserRay from '../../components/Combat/LaserRay';
import PlayerBullets from '../../components/Combat/PlayerBullets';
import PlayerCannonHitDamage from '../../components/Combat/PlayerCannonHitDamage';
import BreakupVfx from '../../components/Combat/BreakupVfx';
import SharedInteractionSceneTools from '../../components/SharedInteractionSceneTools';
import CollisionDebug from '../../components/Debug/CollisionDebug';
import { useSaveSystem } from '../../hooks/useSaveSystem';
import { loadSlot, NARRATIVE_AUTOSAVE_SLOT, NARRATIVE_MANUAL_SLOT } from '../../context/SaveStore';
import { apply, savedQuaternionToEuler } from '../../context/SaveManager';
import { ShipDepthOfField } from '../../components/Ship/ShipDepthOfField';
import SolarSystem from '../../components/Planets/SolarSystem';
import SunGravity from '../../components/Environment/SunGravity';
import SpaceParticles from '../../components/Environment/SpaceParticles';
import SkySphere from '../../components/Environment/SkySphere';
import { FloatingOrigin } from '../../components/Environment/FloatingOrigin';
import { SANDBOX_USE_FLOATING_ORIGIN } from '../../config/debugConfig';
import { GARBAGE_SCOW_MODULES } from '../../config/miningConfig';
import SalvageField from '../../components/SalvageConfig/SalvageField';
import NormalTravelZoneRing from '../../components/FastTravel/NormalTravelZoneRing';
import { NarrativeSatelliteMissionController } from '../../config/events/satellite-mission/deploy-satellite';
import OrbitalSatellite from '../../config/events/satellite-mission/OrbitalSatellite';

import {
  getNarrativeMarsNormalTravelRadius,
  getNarrativeMarsZoneCenter,
  getNarrativePrimaryFieldOrigin,
  getNarrativeSecondaryFieldOrigin,
  getNarrativeShipSpawn,
  NARRATIVE_CONFIG,
  NARRATIVE_BAKERFIELD_ID_PREFIX,
  NARRATIVE_DONINGTON_DOCK_ID,
  NARRATIVE_DONINGTON_STATION_ID,
  NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS,
  NARRATIVE_MARS_ZONE_ID,
  NARRATIVE_PRIMARY_ZONE_ID,
  NARRATIVE_SATELLITE_CONTAINER_LOCAL_ID,
  NARRATIVE_SECONDARY_ZONE_ID,
} from './narrativeSceneConfig';
import { DONINGTON_STATION_DOCK_CONFIG } from '../../config/landingPads/donington-station';
import { BAKERFIELD_FALLS_DOCK_CONFIG } from '../../config/landingPads/bakerfield-falls';
import { registerDock } from '../../context/DockablePartnerStore';
import NarrativeConfigCanvas from './NarrativeConfigCanvas';

const CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

function SaveSystemBridge() {
  useSaveSystem({
    autosaveSlot: NARRATIVE_AUTOSAVE_SLOT,
    manualSlot: NARRATIVE_MANUAL_SLOT,
  });
  return null;
}

interface NarrativeConfigSceneProps {
  loadSave?: boolean;
}

export default function NarrativeConfigScene({ loadSave }: NarrativeConfigSceneProps) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const {
    fogColor,
    solarSystemScale,
    tutorialFollowOffset,
    tutorialCameraZoomMax,
    planetImpactCameraHoldMaxAltitude,
    shipParticleCount,
    lighting,
    satelliteMissionConfig,
  } = NARRATIVE_CONFIG;

  // Load saved state before first render if requested.
  // apply() is idempotent so the StrictMode double-invocation of useMemo is harmless.
  const savedSpawn = useMemo(() => {
    if (!loadSave) return null;
    const data = loadSlot(NARRATIVE_MANUAL_SLOT) ?? loadSlot(NARRATIVE_AUTOSAVE_SLOT);
    if (data) {
      apply(data);
      console.info('[narrative] restored save from', data.timestamp);
      return {
        position: data.position as [number, number, number],
        rotation: savedQuaternionToEuler(data.quaternion),
        velocity: data.velocity as [number, number, number],
      };
    }
    return null;
  }, [loadSave]);

  const shipSpawn = useMemo(() => getNarrativeShipSpawn(), []);
  const effectiveSpawn = savedSpawn ?? shipSpawn;
  const satelliteContainerId = `${NARRATIVE_SATELLITE_CONTAINER_LOCAL_ID}`;

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
    if (savedSpawn) return;
    registerDock({ id: NARRATIVE_DONINGTON_STATION_ID, ...DONINGTON_STATION_DOCK_CONFIG });
  }, [savedSpawn]);

  useLayoutEffect(() => {
    // Skip spawn override when a save was loaded — apply() already set shipPosRef
    if (savedSpawn) return;
    shipPosRef.current.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    minimapShipPosition.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    const group = spaceshipGroupRef.current;
    if (group) {
      group.position.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
      group.rotation.set(shipSpawn.rotation[0], shipSpawn.rotation[1], shipSpawn.rotation[2]);
    }
  }, [shipSpawn, savedSpawn]);

  const worldContent = (
    <>
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight position={[0, 100, -1000]} intensity={3} color="#ff8819" />
      <SkySphere />
      <SpaceParticles />
      <Suspense fallback={null}>
        <Spaceship
          url="/shuttle-low-british.glb"
          shipGroupRef={spaceshipGroupRef}
          initialPosition={effectiveSpawn.position}
          initialRotation={effectiveSpawn.rotation}
          initialDockedTo={savedSpawn ? undefined : NARRATIVE_DONINGTON_DOCK_ID}
          scale={1}
          initialVelocity={savedSpawn?.velocity ?? [0, 0, 0]}
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
          idPrefix={''}
          showDroneFleet={false}
          dockLabelOverride="Donington Station"
          dockConfigOverride={DONINGTON_STATION_DOCK_CONFIG}
          dockRadioBroadcastEnabled
          dockDriveSignatureEnabled
          dockRadioDialogue={[
            'DONINGTON STATION BROADCASTING.',
            'BILL CHURCHILL AVAILABLE FOR PARCEL HANDOFF.',
          ]}
          dockRadioDockingBay="A1"
        />

        <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />

        <group position={primaryFieldOrigin} name="narrative-primary-field-cargo-containers">
          <OrbitalSatellite
            satelliteContainerId={satelliteContainerId}
            satelliteMissionConfig={satelliteMissionConfig}
          />
        </group>

        <SalvageField
          origin={secondaryFieldOrigin}
          idPrefix={NARRATIVE_BAKERFIELD_ID_PREFIX}
          showDroneFleet={false}
          showDroneAtmosphere
          dockLabelOverride="Bakerfield Falls"
          dockConfigOverride={BAKERFIELD_FALLS_DOCK_CONFIG}
          dockRadioBroadcastEnabled
          dockDriveSignatureEnabled
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
        <NarrativeSatelliteMissionController satelliteContainerId={satelliteContainerId} />
        <DeployedSatellite />
      </Suspense>
    </>
  );

  return (
    <NarrativeConfigCanvas>
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
      <SaveSystemBridge />
      <SharedInteractionSceneTools />
      <CollisionDebug />
      <ShipDepthOfField saturation={0} />
    </NarrativeConfigCanvas>
  );
}
