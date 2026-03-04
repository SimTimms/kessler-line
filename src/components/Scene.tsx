import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';
import { OrbitCamera } from './Camera';
import { SunCycle } from './SunCycle';
import Spaceship from './Spaceship';
import SpaceStation from './SpaceStation';
import SpaceParticles from './SpaceParticles';
import LaserRay from './LaserRay';
import RadioBeacon from './RadioBeacon';
import Neptune from './Neptune';
import EarthPlanet from './EarthPlanet';
import RedPlanetLine from './RedPlanetLine';
import AsteroidBelt from './AsteroidBelt';
import DockingBay from './DockingBay';
import FuelStation from './FuelStation';
import EjectedCargo from './EjectedCargo';
import VelocityIndicator from './VelocityIndicator';
import ShipExplosion from './ShipExplosion';
import SpaceDebris from './SpaceDebris';
import { sceneCamera } from '../context/CameraRef';
import AIShip from './AIShip';
import SolarSystem from './SolarSystem';

import {
  RADIO_BEACON_DEFS,
  BEACON_AUDIO,
  SPACE_STATION_DEF,
  FUEL_STATION_DEF,
  RED_PLANET_DEF,
  GREEN_PLANET_DEF,
  EARTH_DEF,
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

// Renders particles in a separate scene AFTER the DoF pass so they are never
// blurred by the effect. The EffectComposer runs at useFrame priority 1;
// this overlay runs at priority 2.
function ParticleLayer({ shipPositionRef }: { shipPositionRef: { current: THREE.Vector3 } }) {
  const { gl, camera } = useThree();
  const particleScene = useMemo(() => new THREE.Scene(), []);

  useFrame(() => {
    const prev = gl.autoClear;
    gl.autoClear = false;
    gl.render(particleScene, camera);
    gl.autoClear = prev;
  }, 2);

  return createPortal(<SpaceParticles shipPositionRef={shipPositionRef} />, particleScene);
}

function ShipDepthOfField({ shipPosRef }: { shipPosRef: { current: THREE.Vector3 } }) {
  const dofRef = useRef<DepthOfFieldEffect>(null!);

  useFrame(() => {
    if (dofRef.current) {
      dofRef.current.target = shipPosRef.current;
    }
  });

  return (
    <EffectComposer>
      <DepthOfField ref={dofRef} focalLength={402} bokehScale={0.1} height={480} />
    </EffectComposer>
  );
}

export default function Scene() {
  // Neptune starts at orbit angle 1.2 rad within SolarSystem (position=[0,-1000,0], scale=1.3)
  // orbitRadius=5500 → world XZ ≈ [cos(1.2)*5500*1.3, -sin(1.2)*5500*1.3] ≈ [2591, -6664]
  const NEPTUNE_START: [number, number, number] = [2591, 0, -6400];
  const spaceshipPos = useRef(new THREE.Vector3(...NEPTUNE_START));
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const stationGroupRef = useRef<THREE.Group | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#000000' }}
      camera={{ near: 0.01, far: 20000 }}
    >
      <CameraCapture />
      <fogExp2 attach="fog" args={[0x000000, 0.0004]} />
      <OrbitCamera followTarget={spaceshipPos} />
      <Spaceship
        url="/spaceship.glb"
        scale={1}
        positionRef={spaceshipPos}
        shipGroupRef={spaceshipGroupRef}
        initialPosition={NEPTUNE_START}
      />

      <group position={[1000, 0, 100]}>
        <DockingBay stationId="origin" dimensions={new THREE.Vector3(10, 1, 10)} />
      </group>
      <group position={SPACE_STATION_DEF.position}>
        <SpaceStation
          url="/space_station.glb"
          scale={0.04}
          collisionRadius={25}
          stationGroupRef={stationGroupRef}
        />
        <DockingBay
          stationId="space-station"
          dimensions={new THREE.Vector3(40, 1, 10)}
          rotation={[0, 0, 0]}
        />
      </group>
      <group position={FUEL_STATION_DEF.position}>
        <FuelStation
          url="/fuel-station.glb"
          scale={1}
          collisionRadius={25}
          stationGroupRef={stationGroupRef}
        />
      </group>
      {RADIO_BEACON_DEFS.map((def, i) => (
        <group key={def.id} position={def.position}>
          <RadioBeacon
            beaconGroupRef={i === 0 ? beaconGroupRef : undefined}
            index={i}
            audioFile={BEACON_AUDIO[i]}
          />
        </group>
      ))}
      <ParticleLayer shipPositionRef={spaceshipPos} />
      {/*<CollisionDebug />*/}
      <LaserRay
        shipGroupRef={spaceshipGroupRef}
        stationGroupRef={stationGroupRef}
        beaconGroupRef={beaconGroupRef}
      />
      <SolarSystem />
      <AsteroidBelt />
      <SpaceDebris />
      <EjectedCargo />
      <RedPlanetLine shipPositionRef={spaceshipPos} />
      <VelocityIndicator shipPositionRef={spaceshipPos} />
      <AIShip id="0" url="/spaceship.glb" scale={1} position={[100, 0, -2000]} />
      <ShipExplosion shipPositionRef={spaceshipPos} />
      <ShipDepthOfField shipPosRef={spaceshipPos} />
    </Canvas>
  );
}
