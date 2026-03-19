import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadSlot, AUTOSAVE_SLOT } from '../context/SaveStore';
import { apply, savedQuaternionToEuler } from '../context/SaveManager';
import { useSaveSystem } from '../hooks/useSaveSystem';
import { ShipDepthOfField } from './Ship/ShipDepthOfField';
import { OrbitCamera } from './Camera';
import Spaceship from './Ship/Spaceship';
import SpaceStation from './SpaceStation';
import { ParticleLayer } from './ParticleLayer';
import LaserRay from './LaserRay';
import RadioBeacon from './RadioBeacon';
import RedPlanetLine from './RedPlanetLine';
import AsteroidBelt from './AsteroidBelt';
import EarthAsteroidRing from './EarthAsteroidRing';
import DockingBay from './DockingBay';
import FuelStation from './FuelStation';
import EjectedCargo from './EjectedCargo';
import VelocityIndicator from './VelocityIndicator';
import SpaceDebris from './SpaceDebris';
import ProximityHighlight from './ProximityHighlight';
import { sceneCamera } from '../context/CameraRef';
import AIShip from './AIShip';
import SolarSystem, { PLANETS, SOLAR_SYSTEM_SCALE } from './SolarSystem';
import SunGravity from './SunGravity';
import { shipPosRef } from '../context/ShipPos';
import { solarPlanetPositions, fuelStationWorldPos } from '../context/SolarSystemMinimap';
import { navTargetIdRef, navTargetPosRef } from '../context/NavTarget';
import CinematicController from './CinematicController';
import AutopilotController from './AutopilotController';
import NeptuneNoFlyRing from './NeptuneNoFlyRing';
import RailgunWarning from './RailgunWarning';
import NebulaClouds from './NebulaClouds';
import StartZoneAsteroidCluster from './StartZoneAsteroidCluster';
import GhostFleet from './GhostFleet';
import {
  RADIO_BEACON_DEFS,
  BEACON_AUDIO,
  SPACE_STATION_DEF,
  ASTEROID_DOCK_DEF,
  type WorldObjectDef,
} from '../config/worldConfig';

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

type OrbitingBeaconDef = WorldObjectDef & {
  orbit: {
    planetName: string;
    radius: number;
    speed: number;
    phase?: number;
  };
};

function OrbitingRadioBeacon({
  def,
  beaconGroupRef,
  index,
  audioFile,
}: {
  def: OrbitingBeaconDef;
  beaconGroupRef?: { current: THREE.Group | null };
  index?: number;
  audioFile?: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const planetPos = solarPlanetPositions[def.orbit.planetName];
    if (!planetPos || !groupRef.current) return;

    const angle = (def.orbit.phase ?? 0) + clock.getElapsedTime() * def.orbit.speed;
    const orbitX = Math.cos(angle) * def.orbit.radius;
    const orbitZ = Math.sin(angle) * def.orbit.radius;
    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE + orbitX,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE + orbitZ
    );
  });

  return (
    <group ref={groupRef} position={def.position}>
      <RadioBeacon beaconGroupRef={beaconGroupRef} index={index} audioFile={audioFile} />
    </group>
  );
}

function OrbitingFuelStation({
  orbitRadius,
  orbitSpeed,
  phase = 0,
  stationGroupRef,
}: {
  orbitRadius: number;
  orbitSpeed: number;
  phase?: number;
  stationGroupRef?: { current: THREE.Group | null };
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos || !groupRef.current) return;

    const angle = phase + clock.getElapsedTime() * orbitSpeed;
    const orbitX = Math.cos(angle) * orbitRadius;
    const orbitZ = Math.sin(angle) * orbitRadius;
    groupRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE + orbitX,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE + orbitZ
    );

    fuelStationWorldPos.x = groupRef.current.position.x;
    fuelStationWorldPos.z = groupRef.current.position.z;

    if (navTargetIdRef.current === 'fuel-station') {
      navTargetPosRef.current.copy(groupRef.current.position);
    }
  });

  return (
    <group ref={groupRef}>
      <FuelStation
        url="/fuel-station.glb"
        scale={1}
        collisionRadius={25}
        stationGroupRef={stationGroupRef}
      />
    </group>
  );
}

// ── DEV: force-spawn near a planet for testing (overrides autosave) ───────
const DEV_JUPITER_TEST = false;
const DEV_MARS_TEST = true;
// ──────────────────────────────────────────────────────────────────────────

export default function Scene() {
  const neptune = PLANETS.find((planet) => planet.name === 'Neptune');
  const neptuneWorldX = neptune
    ? Math.cos(neptune.initialAngle) * neptune.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const neptuneWorldZ = neptune
    ? -Math.sin(neptune.initialAngle) * neptune.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const NEPTUNE_START_DISTANCE = 20500;
  const NEPTUNE_START: [number, number, number] = [
    neptuneWorldX + NEPTUNE_START_DISTANCE,
    0,
    neptuneWorldZ,
  ];

  const jupiter = PLANETS.find((planet) => planet.name === 'Jupiter');
  const jupiterWorldX = jupiter
    ? Math.cos(jupiter.initialAngle) * jupiter.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const jupiterWorldZ = jupiter
    ? -Math.sin(jupiter.initialAngle) * jupiter.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const JUPITER_TEST_START: [number, number, number] = [jupiterWorldX + 5000, 0, jupiterWorldZ];

  const mars = PLANETS.find((planet) => planet.name === 'Mars');
  const marsWorldX = mars ? Math.cos(mars.initialAngle) * mars.orbitRadius * SOLAR_SYSTEM_SCALE : 0;
  const marsWorldZ = mars
    ? -Math.sin(mars.initialAngle) * mars.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const MARS_TEST_START: [number, number, number] = [marsWorldX + 7200, 0, marsWorldZ];

  const DEFAULT_START = DEV_MARS_TEST
    ? MARS_TEST_START
    : DEV_JUPITER_TEST
      ? JUPITER_TEST_START
      : NEPTUNE_START;
  const defaultBodyX = DEV_MARS_TEST
    ? marsWorldX
    : DEV_JUPITER_TEST
      ? jupiterWorldX
      : neptuneWorldX;
  const defaultBodyZ = DEV_MARS_TEST
    ? marsWorldZ
    : DEV_JUPITER_TEST
      ? jupiterWorldZ
      : neptuneWorldZ;

  const startDirection = new THREE.Vector3(
    defaultBodyX - DEFAULT_START[0],
    0,
    defaultBodyZ - DEFAULT_START[2]
  ).normalize();
  const startYaw = Math.atan2(startDirection.x, startDirection.z);

  // On first render, attempt to restore from autosave; fall back to default start.
  const didInitShipRef = useRef(false);
  const savedInitRef = useRef<{
    position: [number, number, number];
    rotation: [number, number, number];
  } | null>(null);
  if (!didInitShipRef.current) {
    const savedData = DEV_JUPITER_TEST || DEV_MARS_TEST ? null : loadSlot(AUTOSAVE_SLOT);
    if (savedData) {
      apply(savedData); // patches shipPosRef + all other global refs
      savedInitRef.current = {
        position: savedData.position,
        rotation: savedQuaternionToEuler(savedData.quaternion),
      };
    } else {
      if (DEV_JUPITER_TEST) {
        navTargetIdRef.current = 'jupiter';
        navTargetPosRef.current.set(jupiterWorldX, 0, jupiterWorldZ);
      } else if (DEV_MARS_TEST) {
        navTargetIdRef.current = 'Mars';
        navTargetPosRef.current.set(marsWorldX, 0, marsWorldZ);
      }
      shipPosRef.current.set(...DEFAULT_START);
    }
    didInitShipRef.current = true;
  }

  const shipInitPos = savedInitRef.current?.position ?? DEFAULT_START;
  const shipInitRot =
    savedInitRef.current?.rotation ?? ([0, startYaw, 0] as [number, number, number]);

  const spaceshipPos = shipPosRef;
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const stationGroupRef = useRef<THREE.Group | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);
  const neptuneWorldRadius = (neptune?.radius ?? 0) * SOLAR_SYSTEM_SCALE;
  const fuelStationOrbitRadius = neptuneWorldRadius * 8.0;
  const fuelStationOrbitSpeed = -0.005;

  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#000000', touchAction: 'none' }}
      camera={{ near: 0.01, far: 1000000 }}
    >
      <CameraCapture />
      <SaveSystemBridge />
      <fogExp2 attach="fog" args={[0x000000, 0.0004]} />

      <group position={[1000, 0, 100]}>
        <DockingBay stationId="origin" dimensions={new THREE.Vector3(10, 1, 10)} />
      </group>
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
      {RADIO_BEACON_DEFS.map((def, i) =>
        def.orbit ? (
          <OrbitingRadioBeacon
            key={def.id}
            def={def as OrbitingBeaconDef}
            beaconGroupRef={i === 0 ? beaconGroupRef : undefined}
            index={i}
            audioFile={BEACON_AUDIO[i]}
          />
        ) : (
          <group key={def.id} position={def.position}>
            <RadioBeacon
              beaconGroupRef={i === 0 ? beaconGroupRef : undefined}
              index={i}
              audioFile={BEACON_AUDIO[i]}
            />
          </group>
        )
      )}
      <ParticleLayer shipPositionRef={spaceshipPos} />
      <LaserRay
        shipGroupRef={spaceshipGroupRef}
        stationGroupRef={stationGroupRef}
        beaconGroupRef={beaconGroupRef}
      />
      <SolarSystem scale={4} />
      <NeptuneNoFlyRing />
      <EarthAsteroidRing />
      <SunGravity />
      <AsteroidBelt />
      <group position={[0, 0, 0]}>
        <StartZoneAsteroidCluster center={[76000, -3000, -129376]} />
        <NebulaClouds center={[76000, -3000, -129376]} />
      </group>
      <SpaceDebris />
      <EjectedCargo />
      <ProximityHighlight />
      <RedPlanetLine shipPositionRef={spaceshipPos} />
      <RailgunWarning shipPositionRef={spaceshipPos} shipGroupRef={spaceshipGroupRef} />
      <VelocityIndicator shipPositionRef={spaceshipPos} />
      <AIShip id="0" url="/untitled.gltf" scale={1} position={[100, 0, -2000]} />
      <GhostFleet />
      <ShipDepthOfField shipPosRef={spaceshipPos} />
      <OrbitCamera followTarget={spaceshipPos} attachTo={spaceshipGroupRef} />
      <CinematicController shipPositionRef={spaceshipPos} />
      <AutopilotController />
      <Spaceship
        url="/untitled.gltf"
        positionRef={spaceshipPos}
        shipGroupRef={spaceshipGroupRef}
        initialPosition={shipInitPos}
        initialRotation={shipInitRot}
        enableShipExplosion
        enableShipParticleCloud
        shipParticleCloudProps={{
          count: 660,
          enableInEarthField: true,
          enableImpactSound: true,
          enableSpeedGate: true,
          speedGateMin: 100,
          speedGateMax: 800,
          speedGateOverridesField: true,
        }}
      />

      {/*<CollisionDebug />*/}
    </Canvas>
  );
}
