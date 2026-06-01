import { Suspense, useLayoutEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialStepWatcher from '../TutorialShared/TutorialStepWatcher';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import DefaultLighting from '../DefaultLighting';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../../config/particleConfig';
import LaserRay from '../Combat/LaserRay';
import ProximityHighlight from '../Proximity/ProximityHighlight';
import ScannerRangeRings from '../Scanners/ScannerRangeRings';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import TutorialOrbitalSolarSystem from './TutorialOrbitalSolarSystem';
import PlanetSurfaceImpactDust from '../Environment/PlanetSurfaceImpactDust';
import {
  applyTutorialOrbitalSpawn,
  getTutorialOrbitalSpawnTangentSpeed,
  getTutorialOrbitalSpawnWorldPosition,
  TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE,
  TUTORIAL_ORBITAL_CAMERA_ZOOM_MAX,
  TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION,
  TUTORIAL_ORBITAL_SHIP_ORBIT_RADIUS,
  TUTORIAL_ORBITAL_SHIP_SURFACE_CLEARANCE,
} from '../../config/tutorialOrbitalConfig';

interface TutorialOrbitalSceneProps {
  onStepAdvance: () => void;
}

const TUTORIAL_FOLLOW_OFFSET: [number, number, number] = [-40, 50, 50];

export default function TutorialOrbitalScene({ onStepAdvance }: TutorialOrbitalSceneProps) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const spawnTangentSpeed = getTutorialOrbitalSpawnTangentSpeed();
  const fogColor = '#000000';
  const lightColor = '#FFFFFF';
  const spawnCameraPosition = getTutorialOrbitalSpawnWorldPosition(new THREE.Vector3()).add(
    new THREE.Vector3(...TUTORIAL_FOLLOW_OFFSET)
  );

  useLayoutEffect(() => {
    applyTutorialOrbitalSpawn(spaceshipGroupRef.current);
  }, [TUTORIAL_ORBITAL_SHIP_ORBIT_RADIUS]);

  return (
    <>
      <Canvas
        style={{ width: '100vw', height: '100vh', background: fogColor, touchAction: 'none' }}
        camera={{
          position: [spawnCameraPosition.x, spawnCameraPosition.y, spawnCameraPosition.z],
          near: CANVAS_NEAR,
          far: CANVAS_FAR,
        }}
        gl={{
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: TONE_MAPPING_EXPOSURE,
        }}
        shadows={true}
      >
        <fogExp2 attach="fog" args={[fogColor, 0.000005]} />
        <DefaultLighting
          color={lightColor}
          intensity={6}
          ambientIntensity={0.02}
          position={[0, 4000, 40000]}
        />
        <TutorialFollowCamera
          followTarget={shipPosRef}
          followOffset={TUTORIAL_FOLLOW_OFFSET}
          zoomMax={TUTORIAL_ORBITAL_CAMERA_ZOOM_MAX}
          attachTo={spaceshipGroupRef}
          flattenBanking
          planetImpactCameraHoldMaxAltitude={TUTORIAL_ORBITAL_CAMERA_HOLD_MAX_ALTITUDE}
        />
        <PlanetSurfaceImpactDust />
        <TutorialStepWatcher onStepAdvance={onStepAdvance} />
        <TutorialOrbitalSolarSystem>
          <Suspense fallback={null}>
            <Spaceship
              key={`${TUTORIAL_ORBITAL_SHIP_ORBIT_RADIUS}-${TUTORIAL_ORBITAL_SHIP_SURFACE_CLEARANCE}`}
              url="/shuttle-low-british.glb"
              shipGroupRef={spaceshipGroupRef}
              initialPosition={TUTORIAL_ORBITAL_SHIP_INITIAL_POSITION}
              scale={1}
              initialVelocity={[0, 0, spawnTangentSpeed]}
              shipParticleCloudProps={{
                count: SHIP_PARTICLE_COUNT,
                enableSpeedGate: true,
                speedGateMin: SHIP_PARTICLE_SPEED_MIN,
                speedGateMax: SHIP_PARTICLE_SPEED_MAX,
              }}
            />
            <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
            <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />
          </Suspense>
        </TutorialOrbitalSolarSystem>
        <ProximityHighlight />
        <ScannerRangeRings />
        <ShipDepthOfField saturation={-1} />
      </Canvas>
    </>
  );
}
