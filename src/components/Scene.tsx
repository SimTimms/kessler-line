import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
import SolarSystem from './Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';
import SunGravity from './Environment/SunGravity';
import { shipPosRef } from '../context/ShipPos';
import AutopilotController from './AutopilotController';
import NeptuneNoFlyRing from './Planets/Neptune/NeptuneNoFlyRing';
import NeptuneDustRing from './Planets/Neptune/NeptuneDustRing';
import RailgunWarning from './Combat/RailgunWarning';
import NebulaClouds from './Environment/NebulaClouds';
import StartZoneAsteroidCluster from './Environment/StartZoneAsteroidCluster';
import GhostFleet from './NPCs/GhostFleet';
import DistressBeaconField from './DistressBeacon/DistressBeaconField';
import MarsSystem from './Planets/MarsSystem';
import SkySphere from './Environment/SkySphere';
import { RadioBeacons } from './RadioBeacons';
import CinematicController from '../components/Cinematic/CinematicController';
import { SPACE_STATION_DEF, ASTEROID_DOCK_DEF } from '../config/worldConfig';
import { START_ZONE_CENTER } from '../config/spawnConfig';
import CollisionDebug from './Debug/CollisionDebug';
import {
  FOG_COLOR,
  FOG_DENSITY,
  CANVAS_NEAR,
  CANVAS_FAR,
  TONE_MAPPING_EXPOSURE,
} from '../config/visualConfig';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../config/particleConfig';
import { OrbitingFuelStation } from './OrbitingFuelStation';
import RadiationZones from './RadiationZones';

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

export default function Scene() {
  const { shipInitPos, shipInitRot, fuelStationOrbitRadius, fuelStationOrbitSpeed } = useShipInit();

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
      <Spaceship
        url="/untitled.gltf"
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
      <CameraCapture />
      <SaveSystemBridge />
      <SkySphere />
      <fogExp2 attach="fog" args={[FOG_COLOR, FOG_DENSITY]} />

      {/* Asteroid Dock — placeholder cube until GLB model is ready */}
      <mesh position={ASTEROID_DOCK_DEF.position}>
        <boxGeometry args={[80, 80, 80]} />
        <meshStandardMaterial color="#ff9900" emissive="#331800" />
      </mesh>

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
      <RadioBeacons beaconGroupRef={beaconGroupRef} />
      <ParticleLayer />
      <LaserRay
        shipGroupRef={spaceshipGroupRef}
        stationGroupRef={stationGroupRef}
        beaconGroupRef={beaconGroupRef}
      />
      <SolarSystem scale={SOLAR_SYSTEM_SCALE} />
      <MarsSystem />
      <NeptuneNoFlyRing />
      <NeptuneDustRing />
      <EarthAsteroidRing />
      <BrokenVenusMoon />
      <RadiationZones />
      <SunGravity />
      <AsteroidBelt />
      <StartZoneAsteroidCluster center={START_ZONE_CENTER} />
      <NebulaClouds center={START_ZONE_CENTER} />
      <SpaceDebris />
      <CargoContainerField />
      <ScrapperCargoContainer />
      <EjectedCargo />
      <ProximityHighlight />
      <RailgunWarning shipGroupRef={spaceshipGroupRef} />
      <AIShip id="0" url="/untitled.gltf" scale={1} position={[-401000, 0, 0]} />
      <AIScrapper url="/large_ship.glb" />
      <GhostFleet />
      <DistressBeaconField />
      <ShipDepthOfField />
      <OrbitCamera followTarget={shipPosRef} attachTo={spaceshipGroupRef} />
      <CinematicController />
      <AutopilotController />
      {/*<CollisionDebug />*/}
    </Canvas>
  );
}
