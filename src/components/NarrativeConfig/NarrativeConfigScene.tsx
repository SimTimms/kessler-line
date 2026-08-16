import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipVelocity } from '../../context/ShipState';
import type { ShipUndockedDetail } from '../../hooks/shipPhysics/docking';
import { deployedSatelliteRef } from '../../context/DeployedSatelliteState';
import DeployedSatellite from './DeployedSatellite';
import LaserRay from '../Combat/LaserRay';
import PlayerBullets from '../Combat/PlayerBullets';
import PlayerCannonHitDamage from '../Combat/PlayerCannonHitDamage';
import BreakupVfx from '../Combat/BreakupVfx';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import CollisionDebug from '../Debug/CollisionDebug';
import { useSaveSystem } from '../../hooks/useSaveSystem';
import { loadSlot, NARRATIVE_AUTOSAVE_SLOT, NARRATIVE_MANUAL_SLOT } from '../../context/SaveStore';
import { apply, savedQuaternionToEuler } from '../../context/SaveManager';
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
import type { DockConfig } from '../../config/dockConfig';
import { getCargoContainer } from '../../context/CargoContainerRegistry';
import { unregisterCollidable } from '../../context/CollisionRegistry';
import { orbitStatusRef } from '../../context/ShipState';
import { addMessage } from '../../context/MessageStore';
import { pushAlert } from '../../context/AlertsStore';
import { fireNarrativeHail } from '../../narrative/narrativeHail';
import {
  getNarrativeMarsNormalTravelRadius,
  getNarrativeMarsZoneCenter,
  getNarrativePrimaryFieldOrigin,
  getNarrativeSecondaryFieldOrigin,
  getNarrativeShipSpawn,
  NARRATIVE_CONFIG,
  NARRATIVE_DONINGTON_DOCK_ID,
  NARRATIVE_DONINGTON_STATION_ID,
  NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS,
  NARRATIVE_MARS_ZONE_ID,
  NARRATIVE_PRIMARY_ZONE_ID,
  NARRATIVE_SATELLITE_CONTAINER_LABEL,
  NARRATIVE_SATELLITE_CONTAINER_LOCAL_ID,
  NARRATIVE_SECONDARY_ZONE_ID,
} from './narrativeSceneConfig';
import {
  BAKERFIELD_FALLS_DOCK_CONFIG,
  DONINGTON_STATION_DOCK_CONFIG,
} from '../../config/docks/narrativeDockConfig';
import { registerDock } from '../../context/DockablePartnerStore';
import { CANVAS_FOV } from '../../config/visualConfig';

const CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

function SaveSystemBridge() {
  useSaveSystem({
    autosaveSlot: NARRATIVE_AUTOSAVE_SLOT,
    manualSlot: NARRATIVE_MANUAL_SLOT,
  });
  return null;
}

/** Any closed orbit around Mars (periapsis above surface) counts as stable enough. */
function isStableMarsOrbitForDeployment(): boolean {
  const status = orbitStatusRef.current;
  return status.bodyId === 'Mars' && status.isOrbiting === true;
}

function fireEliasVossHail() {
  fireNarrativeHail({
    contactId: 'elias-voss-satellite-confirmed',
    dialogueTreeId: 'elias-voss-satellite-hail',
    shipName: 'Donington Station',
    captainName: 'Elias Voss',
    dockHistory: {
      dockId: NARRATIVE_DONINGTON_STATION_ID,
      contactId: 'elias-voss',
    },
  });
}

function NarrativeSatelliteMissionController({
  satelliteContainerId,
}: {
  satelliteContainerId: string;
}) {
  const missionArmedRef = useRef(false);
  const releaseHintShownRef = useRef(false);
  const completedRef = useRef(false);
  const wasTowedRef = useRef(false);

  // Handle successful deployment in the ShipUndocked event — runs synchronously in the
  // same dispatch as the CargoContainer handler, so we can kill collision and physics
  // before anything re-registers them.
  useEffect(() => {
    const onUndocked = (e: Event) => {
      if (completedRef.current || !missionArmedRef.current || !wasTowedRef.current) return;
      if (!isStableMarsOrbitForDeployment()) return;

      const satellite = getCargoContainer(satelliteContainerId);
      if (!satellite || satellite.isConsumed()) return;

      completedRef.current = true;

      // Kill collision immediately — before CargoContainer's handler can re-register it
      unregisterCollidable(`${satelliteContainerId}`);

      // Capture release position and velocity for the deployed satellite.
      // Phase 1 (30 s) applies gravity so it tracks the same orbit as the ship.
      // Phase 2 locks into a non-physical circular orbit at the final position.
      const satPos = satellite.getSimPosition();
      const detail = (e as CustomEvent<ShipUndockedDetail>).detail;
      const releaseVel = detail?.partnerReleaseVelocity;
      deployedSatelliteRef.current = {
        releaseX: satPos.x,
        releaseZ: satPos.z,
        releaseVelX: releaseVel?.x ?? shipVelocity.x,
        releaseVelZ: releaseVel?.z ?? shipVelocity.z,
        yTarget: -30,
        deployed: true,
      };

      // Hide the cargo container and mark consumed — also prevents the CargoContainer
      // undock handler from re-enabling collision (it exits early when consumed).
      satellite.completeDropOff();

      pushAlert('Mission Complete: Mars satellite deployed.', 'blue');
      fireEliasVossHail();
    };

    window.addEventListener('ShipUndocked', onUndocked);
    return () => window.removeEventListener('ShipUndocked', onUndocked);
  }, [satelliteContainerId]);

  useFrame(() => {
    if (completedRef.current) return;

    const satellite = getCargoContainer(satelliteContainerId);
    if (!satellite || satellite.isConsumed()) return;

    const isTowed = satellite.isTowed();
    if (isTowed && !missionArmedRef.current) {
      missionArmedRef.current = true;
      pushAlert(
        'Mission Updated: tow the satellite to stable Mars orbit, then release it.',
        'yellow'
      );
      addMessage({
        id: 'narrative-satellite-mission-brief',
        from: 'Comms Officer Elias Voss',
        subject: 'Deployment Briefing',
        body: 'Satellite package acquired. Move to stable Mars orbit and undock the Orbital Survey Satellite container to deploy.',
        platform: 'REACH',
      });
    }

    if (
      isTowed &&
      missionArmedRef.current &&
      !releaseHintShownRef.current &&
      isStableMarsOrbitForDeployment()
    ) {
      releaseHintShownRef.current = true;
      pushAlert('Stable Mars orbit confirmed. Undock now to deploy satellite.', 'blue');
    }

    // Failed deployment — released outside stable orbit.
    // (Successful deployment is handled by the ShipUndocked listener above.)
    if (wasTowedRef.current && !isTowed && missionArmedRef.current) {
      releaseHintShownRef.current = false;
      pushAlert('Deployment failed: release the container only in stable Mars orbit.', 'red');
    }

    wasTowedRef.current = isTowed;
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
    satelliteMissionContainerLocalToPrimaryField,
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
  const satelliteContainerDock = useMemo<DockConfig>(
    () => ({
      ...CARGO_CONTAINER_DOCK,
      label: NARRATIVE_SATELLITE_CONTAINER_LABEL,
      inventory: {
        label: 'Satellite Payload',
        slots: [
          {
            itemId: 'orbital-survey-satellite',
            quantity: 1,
            capacity: 1,
            supply: 0.05,
            demand: 0.95,
          },
        ],
      },
    }),
    []
  );

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

  // Eagerly register the Donington dock partner so that hasDockablePartner()
  // returns true when the ShipDocked event fires from initialDockedTo.
  // The DockingBay inside LandingPad is proximity-gated and won't mount until
  // after the first useFrame, which is too late for the initial dock event.
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
          <CargoContainer
            id={satelliteContainerId}
            label={satelliteMissionContainerLocalToPrimaryField.label}
            position={satelliteMissionContainerLocalToPrimaryField.position}
            rotation={satelliteMissionContainerLocalToPrimaryField.rotation}
            initialVelocity={satelliteMissionContainerLocalToPrimaryField.initialVelocity}
            scale={satelliteMissionContainerLocalToPrimaryField.scale}
            dock={satelliteContainerDock}
            showCaptureMesh
          />
        </group>

        <SalvageField
          origin={secondaryFieldOrigin}
          idPrefix={''}
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
    <Canvas
      dpr={[1, 1.5]}
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
      <SunGravity />
      <SaveSystemBridge />
      <SharedInteractionSceneTools />
      <CollisionDebug />
      <ShipDepthOfField saturation={0} />
    </Canvas>
  );
}
