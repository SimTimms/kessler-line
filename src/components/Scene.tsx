import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useGraphicsQuality } from '../hooks/useGraphicsQuality';
import { getGraphicsSettings } from '../context/GraphicsState';
import * as THREE from 'three';
import { useSaveSystem } from '../hooks/useSaveSystem';
import { useShipInit } from '../hooks/useShipInit';
import { ShipDepthOfField } from './Ship/ShipDepthOfField';
import { OrbitCamera } from './Camera';
import Spaceship from './Ship/Spaceship';
import SpaceStation from './WorldObjects/SpaceStation';
import { ParticleLayer } from './Environment/ParticleLayer';
import LaserRay from './Combat/LaserRay';
import RadioBeacon from './Radio/RadioBeacon';
import AsteroidBelt from './Environment/AsteroidBelt';
import EarthAsteroidRing from './Planets/Earth/EarthAsteroidRing';
import BrokenVenusMoon from './Planets/Venus/BrokenVenusMoon';
import DockingBay from './WorldObjects/DockingBay';
import EjectedCargo from './WorldObjects/EjectedCargo';
import SpaceDebris from './WorldObjects/SpaceDebris';
import CargoContainerField from './WorldObjects/CargoContainerField';
import ProximityHighlight from './Proximity/ProximityHighlight';
import { sceneCamera } from '../context/CameraRef';
import AIShip from './NPCs/AIShip';
import AIScrapper from './NPCs/AIScrapper';
import ScrapperCargoContainer from './NPCs/ScrapperCargoContainer';
import ScrapperRailgunFX from './NPCs/ScrapperRailgunFX';
import ScrapperExplosion from './NPCs/ScrapperExplosion';
import SolarSystem from './Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';
import { shipPosRef } from '../context/ShipPos';
import AutopilotController from './AutopilotController';
import NeptuneNoFlyRing from './Planets/Neptune/NeptuneNoFlyRing';
import NeptuneDustRing from './Planets/Neptune/NeptuneDustRing';
import NeptuneInnerWispyRing from './Planets/Neptune/NeptuneInnerWispyRing';
import RailgunWarning from './Combat/RailgunWarning';
import NebulaClouds from './Environment/NebulaClouds';
import StartZoneAsteroidCluster from './Environment/StartZoneAsteroidCluster';
import GhostFleet from './NPCs/GhostFleet';
import SupportDroneFleet from './NPCs/SupportDroneFleet';
import DistressBeaconField from './DistressBeacon/DistressBeaconField';
import MarsSystem from './Planets/MarsSystem';
import SkySphere from './Environment/SkySphere';
import { RadioBeacons } from './RadioBeacons';
import CinematicController from '../components/Cinematic/CinematicController';
import { SPACE_STATION_DEF, ASTEROID_DOCK_DEF } from '../config/worldConfig';
import { START_ZONE_CENTER } from '../config/spawnConfig';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../config/visualConfig';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../config/particleConfig';
import { OrbitingFuelStation } from './OrbitingFuelStation';
import RadiationZones from './RadiationZones';
import { advanceLoadStage, useLoadStage } from '../context/LoadStageStore';
import DefaultEnvironment from './Environment';
import { defaultConfig } from '../components/Planets/Neptune/NeptuneInnerWispyRing';

const STAGE_2_GLB_URLS = ['/space_station.glb', '/fuel-station.glb', '/container.glb'] as const;
const STAGE_3_GLB_URLS = ['/untitled.gltf', '/large_ship.glb', '/supportDrone.glb'] as const;
const STAGE_4_GLB_URLS = ['/shuttle.glb'] as const;

// ── Internal helpers ──────────────────────────────────────────────────────────

// Captures the R3F camera into a shared module-level ref so DOM overlays
// (MagneticHUD) can project 3D positions to screen space without being
// inside the Canvas.
function CameraCapture() {
  const { camera } = useThree();
  useEffect(() => {
    sceneCamera.current = camera;
    return () => {
      sceneCamera.current = null;
    };
  }, [camera]);
  return null;
}

// Runs the save system (auto-save + keyboard shortcuts) inside the Canvas
// so that useSaveSystem can call useFrame.
function SaveSystemBridge() {
  useSaveSystem();
  return null;
}

// Heavy environment components that remount when graphics quality changes.
// Grouped under a single key so InstancedMesh counts reset correctly.
function HeavyEnvironment() {
  const settings = getGraphicsSettings();
  return (
    <>
      <SkySphere />
      <AsteroidBelt />
      <EarthAsteroidRing />
      <ParticleLayer />
      {settings.nebulaEnabled && <NebulaClouds center={START_ZONE_CENTER} />}
    </>
  );
}

// Mounts only when its parent Suspense boundary has fully resolved.
// Calling advanceLoadStage() here signals the loading screen to progress.
function StageAdvancer({ toStage }: { toStage: number }) {
  useEffect(() => {
    advanceLoadStage(toStage);
  }, [toStage]);
  return null;
}

function ProgressiveAssetPreloader({ loadStage }: { loadStage: number }) {
  // Preload stage-2 world assets as soon as the scene mounts so Stage 2 appears faster.
  useEffect(() => {
    STAGE_2_GLB_URLS.forEach((url) => useGLTF.preload(url));
  }, []);

  useEffect(() => {
    if (loadStage < 1) return;
    STAGE_3_GLB_URLS.forEach((url) => useGLTF.preload(url));
  }, [loadStage]);

  useEffect(() => {
    if (loadStage < 2) return;
    STAGE_4_GLB_URLS.forEach((url) => useGLTF.preload(url));
  }, [loadStage]);

  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export default function Scene() {
  const quality = useGraphicsQuality();
  const settings = getGraphicsSettings();
  const { shipInitPos, shipInitRot, fuelStationOrbitRadius, fuelStationOrbitSpeed } = useShipInit();
  const loadStage = useLoadStage();

  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const stationGroupRef = useRef<THREE.Group | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#000000', touchAction: 'none' }}
      camera={{ near: CANVAS_NEAR, far: CANVAS_FAR }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: TONE_MAPPING_EXPOSURE,
      }}
    >
      <CameraCapture />
      <DefaultEnvironment />
      <SaveSystemBridge />
      <OrbitCamera followTarget={shipPosRef} attachTo={spaceshipGroupRef} />
      <ProgressiveAssetPreloader loadStage={loadStage} />
      <AutopilotController />

      <Suspense fallback={null}>
        <SolarSystem scale={SOLAR_SYSTEM_SCALE} />
        <HeavyEnvironment key={quality} />
        <StageAdvancer toStage={1} />
      </Suspense>

      {/* ── Stage 2: Static world objects (no player interaction needed yet) */}
      {loadStage >= 1 && (
        <>
          {/* Non-suspending world geometry — render immediately at stage 1 */}
          <MarsSystem />
          <NeptuneNoFlyRing />
          <NeptuneDustRing />
          <NeptuneInnerWispyRing config={defaultConfig} />
          <BrokenVenusMoon />
          <RadiationZones />
          <StartZoneAsteroidCluster center={START_ZONE_CENTER} />
          <SpaceDebris />
          <DistressBeaconField />
          <RadioBeacons beaconGroupRef={beaconGroupRef} />
          {/* Asteroid Dock placeholder cube */}
          <mesh position={ASTEROID_DOCK_DEF.position}>
            <boxGeometry args={[80, 80, 80]} />
            <meshStandardMaterial color="#ff9900" emissive="#331800" />
          </mesh>

          {/* GLB-based world objects — suspend until models load → stage → 2 */}
          <Suspense fallback={null}>
            <group position={SPACE_STATION_DEF.position}>
              <SpaceStation
                url="/space_station.glb"
                scale={0.004}
                collisionRadius={25}
                stationGroupRef={stationGroupRef}
              />
              <DockingBay
                stationId="space-station"
                dimensions={new THREE.Vector3(40, 1, 10)}
                rotation={[0, 0, 0]}
              />
              <RadioBeacon />
            </group>
            <OrbitingFuelStation
              orbitRadius={fuelStationOrbitRadius}
              orbitSpeed={fuelStationOrbitSpeed}
              stationGroupRef={stationGroupRef}
            />
            <CargoContainerField />
            <StageAdvancer toStage={2} />
          </Suspense>
        </>
      )}

      {/* ── Stage 3: NPC vessels ─────────────────────────────────────────── */}
      {/* By the time stage 2 completes, SolarSystem has run at least one     */}
      {/* useFrame tick, so solarPlanetPositions['Neptune'] is populated.      */}
      {/* The scrapper's initial orientation fix (slerp guard) is also active. */}
      {loadStage >= 2 && (
        <>
          {/* Non-suspending NPC components */}
          <GhostFleet />
          <ScrapperRailgunFX />
          <ScrapperExplosion />

          {/* GLB-based NPC models → stage → 3 */}
          <Suspense fallback={null}>
            <AIShip id="0" url="/untitled.gltf" scale={1} position={[-401000, 0, 0]} />
            <AIScrapper url="/large_ship.glb" />
            <ScrapperCargoContainer />
            <SupportDroneFleet />
            <StageAdvancer toStage={3} />
          </Suspense>
        </>
      )}

      {/* ── Stage 4: Player ship + combat systems ────────────────────────── */}
      {loadStage >= 3 && (
        <Suspense fallback={null}>
          <Spaceship
            url="/shuttle.glb"
            shipGroupRef={spaceshipGroupRef}
            initialPosition={shipInitPos}
            initialRotation={shipInitRot}
            enableShipExplosion
            shipParticleCloudProps={{
              count: SHIP_PARTICLE_COUNT,
              enableInEarthField: true,
              enableImpactSound: true,
              enableSpeedGate: true,
              speedGateMin: SHIP_PARTICLE_SPEED_MIN,
              speedGateMax: SHIP_PARTICLE_SPEED_MAX,
              speedGateOverridesField: true,
            }}
          />
          <EjectedCargo />
          <LaserRay
            shipGroupRef={spaceshipGroupRef}
            stationGroupRef={stationGroupRef}
            beaconGroupRef={beaconGroupRef}
          />
          <RailgunWarning shipGroupRef={spaceshipGroupRef} />
          <ProximityHighlight />
          {/* CinematicController starts its intro timers on mount — fire only
              once the player ship is in the scene and the world is fully set up */}
          <CinematicController />
          {settings.postProcessingEnabled && <ShipDepthOfField key={quality} />}
          <StageAdvancer toStage={4} />
        </Suspense>
      )}

      {/*<CollisionDebug />*/}
    </Canvas>
  );
}
