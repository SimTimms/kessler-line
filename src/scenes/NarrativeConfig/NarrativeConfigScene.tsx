import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import TutorialFollowCamera from '../../components/TutorialShared/TutorialFollowCamera';
import { shipPosRef } from '../../context/ShipPos';
import DeployedSatellite from '../../eventTrigger/events/satellite-mission/DeployedSatellite';
import SharedInteractionSceneTools from '../../components/SharedInteractionSceneTools';
import CollisionDebug from '../../components/Debug/CollisionDebug';
import { useSaveSystem } from '../../hooks/useSaveSystem';
import { loadSlot, NARRATIVE_AUTOSAVE_SLOT, NARRATIVE_MANUAL_SLOT } from '../../context/SaveStore';
import { apply, savedQuaternionToEuler } from '../../context/SaveManager';
import SolarSystem from '../../components/Planets/SolarSystem';
import SunGravity from '../../components/Environment/SunGravity';
import { FloatingOrigin } from '../../components/Environment/FloatingOrigin';
import { SANDBOX_USE_FLOATING_ORIGIN } from '../../config/debugConfig';
import { NarrativeSatelliteMissionController } from '../../eventTrigger/events/satellite-mission/deploy-satellite';
import OrbitalSatellite from '../../eventTrigger/events/satellite-mission/OrbitalSatellite';
import CommsRelayMissionController from '../../eventTrigger/events/comms-relay-mission/CommsRelayMissionController';
import CommsBufferSatellite from '../../eventTrigger/events/comms-relay-mission/CommsBufferSatellite';
import DerelictField from '../../components/Ship/DerelictField';
import { spawnShip } from './helpers/spawnShip';
import Bakersfield from './Bakersfield';
import Donington from './Donington';
import PlayerShip from './PlayerShip';
import { registerTimedEvent, resetTimedEvents } from '../../eventTrigger/event-trigger';
import { ELIAS_VOSS_HAIL_EVENT_ID } from '../../eventTrigger/events';

import {
  getNarrativePrimaryFieldOrigin,
  getNarrativeSecondaryFieldOrigin,
  getNarrativeShipSpawn,
  NARRATIVE_CONFIG,
  NARRATIVE_DONINGTON_STATION_ID,
  NARRATIVE_SATELLITE_CONTAINER_LOCAL_ID,
  NARRATIVE_DONINGTON_DOCK_ID,
} from './narrativeSceneConfig';
import { DONINGTON_STATION_DOCK_CONFIG } from '../../config/landingPads/donington-station';
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
    satelliteMissionConfig,
  } = NARRATIVE_CONFIG;

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

  useEffect(() => {
    registerTimedEvent(ELIAS_VOSS_HAIL_EVENT_ID, 300_000);
    return () => resetTimedEvents();
  }, []);

  useLayoutEffect(() => {
    if (savedSpawn || shipSpawn.skipDock) return;
    registerDock({ id: NARRATIVE_DONINGTON_STATION_ID, ...DONINGTON_STATION_DOCK_CONFIG });
  }, [savedSpawn, shipSpawn.skipDock]);

  useLayoutEffect(() => {
    if (savedSpawn) return;
    spawnShip({ spaceshipGroupRef: spaceshipGroupRef as unknown as React.RefObject<THREE.Group> });
  }, [shipSpawn, savedSpawn, spaceshipGroupRef]);

  const worldContent = (
    <>
      <PlayerShip
        effectiveSpawn={effectiveSpawn}
        savedSpawn={savedSpawn ?? { velocity: [0, 0, 0] }}
        spaceshipGroupRef={spaceshipGroupRef as unknown as React.RefObject<THREE.Group>}
        initialDockedTo={NARRATIVE_DONINGTON_DOCK_ID}
      />

      <Suspense fallback={null}>
        <SolarSystem scale={solarSystemScale} />
      </Suspense>

      <Donington
        primaryFieldOrigin={primaryFieldOrigin}
        secondaryFieldOrigin={secondaryFieldOrigin}
      />

      <Bakersfield secondaryFieldOrigin={secondaryFieldOrigin} />

      <Suspense fallback={null}>
        <group position={primaryFieldOrigin} name="narrative-primary-field-cargo-containers">
          <OrbitalSatellite
            satelliteContainerId={satelliteContainerId}
            satelliteMissionConfig={satelliteMissionConfig}
          />
        </group>

        <NarrativeSatelliteMissionController satelliteContainerId={satelliteContainerId} />
        <DeployedSatellite />
        <CommsRelayMissionController />
        <CommsBufferSatellite />
      </Suspense>

      <Suspense fallback={null}>
        <DerelictField />
      </Suspense>
    </>
  );

  return (
    <NarrativeConfigCanvas>
      <directionalLight position={[20, 3, -20]} intensity={0.4} color={0xffffff} castShadow />
      <ambientLight intensity={0.1} color={0xffffff} />
      <fogExp2 attach="fog" args={[fogColor, 0.000005]} />
      <TutorialFollowCamera
        followTarget={shipPosRef}
        followOffset={tutorialFollowOffset}
        zoomMax={tutorialCameraZoomMax}
        attachTo={spaceshipGroupRef}
        flattenBanking
        lockPolarAngle
        framePriority={CAMERA_FRAME_PRIORITY}
      />
      {SANDBOX_USE_FLOATING_ORIGIN ? <FloatingOrigin>{worldContent}</FloatingOrigin> : worldContent}
      <SunGravity />
      <SaveSystemBridge />
      <SharedInteractionSceneTools />
      <CollisionDebug />
    </NarrativeConfigCanvas>
  );
}
