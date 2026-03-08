import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ShipDepthOfField } from './ShipDepthOfField';
import { OrbitCamera } from './Camera';
import Spaceship from './Spaceship';
import SpaceStation from './SpaceStation';
import { ParticleLayer } from './ParticleLayer';
import LaserRay from './LaserRay';
import RadioBeacon from './RadioBeacon';
import RedPlanetLine from './RedPlanetLine';
import AsteroidBelt from './AsteroidBelt';
import EarthAsteroidRing from './EarthAsteroidRing';
import ShipParticleCloud from './ShipParticleCloud';
import DockingBay from './DockingBay';
import FuelStation from './FuelStation';
import EjectedCargo from './EjectedCargo';
import VelocityIndicator from './VelocityIndicator';
import ShipExplosion from './ShipExplosion';
import SpaceDebris from './SpaceDebris';
import ProximityHighlight from './ProximityHighlight';
import { sceneCamera } from '../context/CameraRef';
import AIShip from './AIShip';
import SolarSystem, { PLANETS, SOLAR_SYSTEM_SCALE } from './SolarSystem';
import SunGravity from './SunGravity';
import { shipPosRef } from '../context/ShipPos';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import {
  RADIO_BEACON_DEFS,
  BEACON_AUDIO,
  SPACE_STATION_DEF,
  FUEL_STATION_DEF,
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

export default function Scene() {
  // Spawn near Earth for testing orbital mechanics.
  // Earth world position = orbitRadius × SOLAR_SYSTEM_SCALE at its initialAngle.
  const earth = PLANETS[2];
  const earthWorldX = Math.cos(earth.initialAngle) * earth.orbitRadius * SOLAR_SYSTEM_SCALE;
  const earthWorldZ = -Math.sin(earth.initialAngle) * earth.orbitRadius * SOLAR_SYSTEM_SCALE;
  const NEPTUNE_START: [number, number, number] = [
    earthWorldX + 600, // 600 units from Earth center — inside SOI (~2944), outside surface (~368)
    0,
    earthWorldZ,
  ];
  shipPosRef.current.set(...NEPTUNE_START);
  const spaceshipPos = shipPosRef;
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const stationGroupRef = useRef<THREE.Group | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);
  const neptune = PLANETS.find((planet) => planet.name === 'Neptune');
  const neptuneWorldRadius = (neptune?.radius ?? 0) * SOLAR_SYSTEM_SCALE;
  const fuelStationOrbitRadius = neptuneWorldRadius * 8.0;
  const fuelStationOrbitSpeed = -0.005;

  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#000000', touchAction: 'none' }}
      camera={{ near: 0.01, far: 1000000 }}
    >
      <CameraCapture />
      <fogExp2 attach="fog" args={[0x000000, 0.0004]} />
      <OrbitCamera followTarget={spaceshipPos} />
      <Spaceship
        url="/freighter.gltf"
        positionRef={spaceshipPos}
        shipGroupRef={spaceshipGroupRef}
        initialPosition={NEPTUNE_START}
      />
      <ShipParticleCloud
        shipGroupRef={spaceshipGroupRef}
        count={660}
        enableInEarthField
        enableImpactSound
      />

      <group position={[1000, 0, 100]}>
        <DockingBay stationId="origin" dimensions={new THREE.Vector3(10, 1, 10)} />
      </group>
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
      {/*<CollisionDebug />*/}
      <LaserRay
        shipGroupRef={spaceshipGroupRef}
        stationGroupRef={stationGroupRef}
        beaconGroupRef={beaconGroupRef}
      />
      <SolarSystem scale={4} />
      <EarthAsteroidRing />
      <SunGravity />
      <AsteroidBelt />
      <SpaceDebris />
      <EjectedCargo />
      <ProximityHighlight />
      <RedPlanetLine shipPositionRef={spaceshipPos} />
      <VelocityIndicator shipPositionRef={spaceshipPos} />
      <AIShip id="0" url="/spaceship.glb" scale={1} position={[100, 0, -2000]} />
      <ShipExplosion shipPositionRef={spaceshipPos} />
      <ShipDepthOfField shipPosRef={spaceshipPos} />
    </Canvas>
  );
}
