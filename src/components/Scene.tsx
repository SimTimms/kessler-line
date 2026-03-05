import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';
import { OrbitCamera } from './Camera';
import Spaceship from './Spaceship';
import SpaceStation from './SpaceStation';
import SpaceParticles from './SpaceParticles';
import LaserRay from './LaserRay';
import RadioBeacon from './RadioBeacon';
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
import SolarSystem, { PLANETS } from './SolarSystem';
import {
  RADIO_BEACON_DEFS,
  BEACON_AUDIO,
  SPACE_STATION_DEF,
  FUEL_STATION_DEF,
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

// Renders the Sun in a background scene BEFORE the main pass so it is always
// visible regardless of the main camera's far plane. The background camera
// copies the main camera's orientation and FOV but has its own large far value.
// After drawing the background, the depth buffer is cleared so the main scene
// renders in front with correct occlusion.
//   SUN_WORLD_RADIUS = SUN_RADIUS (600) × SolarSystem scale (10.3)
const SUN_WORLD_RADIUS = 600 * 10.3;
const BG_SUN_DIST = 500; // fixed render distance in the background scene

function SunBackground() {
  const { gl, camera } = useThree();
  const bgScene = useMemo(() => new THREE.Scene(), []);
  const bgCamera = useMemo(() => new THREE.PerspectiveCamera(60, 1, 1, BG_SUN_DIST * 3), []);
  const meshRef = useRef<THREE.Mesh>(null!);
  const toSun = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const mainCam = camera as THREE.PerspectiveCamera;

    // Sync bg camera to main camera orientation + FOV
    bgCamera.quaternion.copy(mainCam.quaternion);
    bgCamera.fov = mainCam.fov;
    bgCamera.aspect = mainCam.aspect;
    bgCamera.updateProjectionMatrix();

    // Place bg Sun in the direction of the real Sun (world origin)
    toSun.set(0, 0, 0).sub(camera.position).normalize();
    meshRef.current.position.copy(toSun).multiplyScalar(BG_SUN_DIST);

    // Scale to match the real Sun's angular size at the current distance
    const dist = camera.position.length();
    meshRef.current.scale.setScalar(
      (BG_SUN_DIST * SUN_WORLD_RADIUS) / Math.max(dist, SUN_WORLD_RADIUS)
    );

    // Render bg before the main pass: clear everything, draw the bg Sun, then
    // clear only depth so the main scene renders in front with correct occlusion
    gl.autoClear = false;
    gl.clear();
    gl.render(bgScene, bgCamera);
    gl.clearDepth();
  }, -1);

  // Restore autoClear after the main R3F render
  useFrame(() => {
    gl.autoClear = true;
  }, 1);

  return createPortal(
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#FFFDF0" toneMapped={false} />
    </mesh>,
    bgScene
  );
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
  const NEPTUNE_START: [number, number, number] = [
    PLANETS[7].orbitRadius * 1.3 * Math.cos(1.2),
    0,
    -PLANETS[7].orbitRadius * 1.3 * Math.sin(1.2),
  ];
  const spaceshipPos = useRef(new THREE.Vector3(...NEPTUNE_START));
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const stationGroupRef = useRef<THREE.Group | null>(null);
  const beaconGroupRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', background: '#000000', touchAction: 'none' }}
      camera={{ near: 0.01, far: 1000000 }}
    >
      <CameraCapture />
      <SunBackground />
      <fogExp2 attach="fog" args={[0x000000, 0.0004]} />
      <OrbitCamera followTarget={spaceshipPos} />
      <Spaceship
        url="/freighter.gltf"
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
      <SolarSystem scale={1} />
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
