import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialStepWatcher from './TutorialStepWatcher';
import { shipPosRef } from '../../context/ShipPos';
import { scrapperIntroActive } from '../../context/CinematicState';
import SunGravity from '../Environment/SunGravity';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import TutorialFollowCamera from './TutorialFollowCamera';
import Moon from '../Planets/Moon';
import { SpaceStation } from '../SpaceStation';
import DefaultEnvironment from '../Environment';
import StationDrones from './StationDrones';
import { TUTORIAL_MOON_POSITION, TUTORIAL_MOON_RADIUS } from '../../config/moonConfig';

interface Props {
  onStepAdvance: () => void;
}

const TUTORIAL_STATION_ORBIT_ALTITUDE = 10000;
const TUTORIAL_STATION_ORBIT_RADIUS = TUTORIAL_MOON_RADIUS + TUTORIAL_STATION_ORBIT_ALTITUDE;
// Keep tutorial docking stable/readable: slow orbit to reduce perceived dock jitter.
const TUTORIAL_STATION_ORBIT_SPEED = 0.00045;
const TUTORIAL_STATION_ORBIT_PHASE = Math.PI * 0.15;
const TUTORIAL_STATION_CLUSTER_OFFSET: [number, number, number] = [0, -50, 0];

function OrbitingTutorialStationCluster() {
  const orbitRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!orbitRef.current) return;
    const angle = TUTORIAL_STATION_ORBIT_PHASE + clock.getElapsedTime() * TUTORIAL_STATION_ORBIT_SPEED;
    orbitRef.current.position.set(
      TUTORIAL_MOON_POSITION[0] + Math.cos(angle) * TUTORIAL_STATION_ORBIT_RADIUS,
      0,
      TUTORIAL_MOON_POSITION[2] + Math.sin(angle) * TUTORIAL_STATION_ORBIT_RADIUS
    );
  });

  return (
    <group ref={orbitRef}>
      <group position={TUTORIAL_STATION_CLUSTER_OFFSET}>
        <SpaceStation
          followTargetRef={shipPosRef}
          enableTrackingSpotlight
          spotlightLocalOrigin={[26, 53, -6.8]}
        />
        <StationDrones center={[26, 20, -6.8]} />
      </group>
    </group>
  );
}

export default function TutorialScene({ onStepAdvance }: Props) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    // Tutorial runs as a standalone sandbox: keep core physics/camera behavior
    // but disable the main-scene scrapper cinematic lock-in.
    scrapperIntroActive.current = false;
  }, []);

  return (
    <>
      <Canvas
        style={{ width: '100vw', height: '100vh', background: '#000000', touchAction: 'none' }}
        camera={{ near: CANVAS_NEAR, far: CANVAS_FAR }}
        gl={{
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: TONE_MAPPING_EXPOSURE,
        }}
      >
        <DefaultEnvironment />
        <SunGravity />
        <TutorialFollowCamera followTarget={shipPosRef} followOffset={[0, 10, -30]} />
        <TutorialStepWatcher onStepAdvance={onStepAdvance} />
        <Suspense fallback={null}>
          <Moon />
          <OrbitingTutorialStationCluster />
          <Spaceship
            url="/shuttle.glb"
            shipGroupRef={spaceshipGroupRef}
            initialPosition={[0, 0, 0]}
            initialDockedTo="docking-bay-tutorial-space-station"
            scale={0.5}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
