import { Suspense, useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import { shipPosRef } from '../../context/ShipPos';
import { scrapperIntroActive } from '../../context/CinematicState';
import SunGravity from '../Environment/SunGravity';
import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import TutorialFollowCamera from './TutorialFollowCamera';
import Moon from '../Planets/Moon';
import { SpaceStation } from '../SpaceStation';
import DefaultEnvironment from '../Environment';
import StationDrones from './StationDrones';
import { TUTORIAL_MOON_POSITION, TUTORIAL_MOON_RADIUS } from '../../config/moonConfig';
import TutorialDockingStepWatcher from './TutorialDockingStepWatcher';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';

interface Props {
  onStepAdvance: () => void;
}

const TUTORIAL_STATION_ORBIT_ALTITUDE = 10000;
const TUTORIAL_STATION_ORBIT_RADIUS = TUTORIAL_MOON_RADIUS + TUTORIAL_STATION_ORBIT_ALTITUDE;
const TUTORIAL_STATION_ORBIT_SPEED = 0.00045;
const TUTORIAL_STATION_ORBIT_PHASE = Math.PI * 0.15;
const TUTORIAL_STATION_CLUSTER_OFFSET: [number, number, number] = [0, -50, 0];
const WAYPOINT_LOCAL_POS: [number, number, number] = [220, -20, 170];
const WAYPOINT_DRONE_MAGNETIC_ID = 'tutorial-waypoint-drone';
const WAYPOINT_DRONE_LABEL = 'Waypoint Drone';
const WAYPOINT_DRONE_SCALE = 1.45;
const WAYPOINT_DRONE_ROTATION: [number, number, number] = [-Math.PI * 0.5, Math.PI, 0];

function WaypointDrone({ waypointRef }: { waypointRef: RefObject<THREE.Group | null> }) {
  const gltf = useGLTF('/drone/untitled.gltf') as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    registerMagnetic({
      id: WAYPOINT_DRONE_MAGNETIC_ID,
      label: WAYPOINT_DRONE_LABEL,
      getPosition: (target) => {
        if (groupRef.current) {
          groupRef.current.getWorldPosition(target);
        } else {
          target.set(0, 0, 0);
        }
        return target;
      },
      getVelocity: (target) => target.set(0, 0, 0),
    });
    return () => {
      unregisterMagnetic(WAYPOINT_DRONE_MAGNETIC_ID);
    };
  }, []);

  return (
    <group
      ref={(el) => {
        groupRef.current = el;
        waypointRef.current = el;
      }}
      position={WAYPOINT_LOCAL_POS}
      rotation={WAYPOINT_DRONE_ROTATION}
      scale={WAYPOINT_DRONE_SCALE}
    >
      <primitive object={gltf.scene} />
      <pointLight color="#63dcff" intensity={80} distance={1500} decay={1.6} />
    </group>
  );
}

function OrbitingDockingStationCluster({
  waypointRef,
}: {
  waypointRef: RefObject<THREE.Group | null>;
}) {
  const orbitRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!orbitRef.current) return;
    const angle =
      TUTORIAL_STATION_ORBIT_PHASE + clock.getElapsedTime() * TUTORIAL_STATION_ORBIT_SPEED;
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
        <WaypointDrone waypointRef={waypointRef} />
      </group>
    </group>
  );
}

export default function TutorialDockingScene({ onStepAdvance }: Props) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const waypointRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    scrapperIntroActive.current = false;
  }, []);

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
      <DefaultEnvironment />
      <SunGravity />
      <TutorialFollowCamera followTarget={shipPosRef} followOffset={[0, 10, -30]} />
      <TutorialDockingStepWatcher onStepAdvance={onStepAdvance} waypointRef={waypointRef} />
      <Suspense fallback={null}>
        <OrbitingDockingStationCluster waypointRef={waypointRef} />
        <Spaceship
          url="/shuttle.glb"
          shipGroupRef={spaceshipGroupRef}
          initialPosition={[0, 0, 0]}
          initialDockedTo="docking-bay-tutorial-space-station"
          scale={0.5}
        />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload('/drone/untitled.gltf');
