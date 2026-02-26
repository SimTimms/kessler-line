import { useRef, useMemo } from 'react';
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
import CollisionDebug from './CollisionDebug';
import Neptune from './Neptune';
import RedPlanetLine from './RedPlanetLine';
import AsteroidBelt from './AsteroidBelt';
import DockingBay from './DockingBay';
import FuelStation from './FuelStation';

import {
  RADIO_BEACON_DEFS,
  BEACON_AUDIO,
  SPACE_STATION_DEF,
  FUEL_STATION_DEF,
  RED_PLANET_DEF,
} from '../config/worldConfig';

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
      <DepthOfField ref={dofRef} focalLength={402} bokehScale={1} height={480} />
    </EffectComposer>
  );
}

export default function Scene() {
  const spaceshipPos = useRef(new THREE.Vector3());
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const stationGroupRef = useRef<THREE.Group | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#000000' }}
      camera={{ near: 0.01, far: 20000 }}
    >
      <fogExp2 attach="fog" args={[0x000000, 0.0004]} />
      <OrbitCamera followTarget={spaceshipPos} />
      <SunCycle />
      <Spaceship
        url="/spaceship.glb"
        scale={1}
        positionRef={spaceshipPos}
        shipGroupRef={spaceshipGroupRef}
      />

      <group position={[0, 0, 10]}>
        <DockingBay dimensions={new THREE.Vector3(10, 1, 10)} />
      </group>
      <group position={SPACE_STATION_DEF.position}>
        <SpaceStation
          url="/space_station.glb"
          scale={0.04}
          collisionRadius={25}
          stationGroupRef={stationGroupRef}
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
      <CollisionDebug />
      <LaserRay
        shipGroupRef={spaceshipGroupRef}
        stationGroupRef={stationGroupRef}
        beaconGroupRef={beaconGroupRef}
      />
      <Neptune />
      <Neptune position={RED_PLANET_DEF.position} scale={40} color={0xff4422} />
      <AsteroidBelt />
      <RedPlanetLine shipPositionRef={spaceshipPos} />
      <ShipDepthOfField shipPosRef={spaceshipPos} />
    </Canvas>
  );
}
