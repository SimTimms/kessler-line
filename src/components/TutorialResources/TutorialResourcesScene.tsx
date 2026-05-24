import { Suspense, memo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialStepWatcher from '../TutorialShared/TutorialStepWatcher';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import { shipPosRef } from '../../context/ShipPos';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import DefaultLighting from '../DefaultLighting';
import LunarLandscape from '../LunarLandscape/LunarLandscape';
import LunarSettlement from '../LunarLandscape/LunarSettlement';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../../config/particleConfig';
import RadiationZones from '../RadiationZones';
import { RADIATION_ZONES } from './radationConfigTutorial';
import { UBoat } from './UBoat';
import LaserRay from '../Combat/LaserRay';
import ProximityHighlight from '../Proximity/ProximityHighlight';
import ScannerRangeRings from '../Scanners/ScannerRangeRings';
import StartZoneAsteroidCluster from '../Environment/StartZoneAsteroidCluster';
import CollisionDebug from '../Debug/CollisionDebug';
import {
  TUTORIAL_RESOURCES_ASTEROID_CENTER,
  TUTORIAL_RESOURCES_ASTEROID_COUNT,
  TUTORIAL_RESOURCES_ASTEROID_INNER_RADIUS,
  TUTORIAL_RESOURCES_ASTEROID_OUTER_RADIUS,
  TUTORIAL_RESOURCES_ASTEROID_SEED,
  TUTORIAL_RESOURCES_ASTEROID_COLLIDABLE_PREFIX,
} from './tutorialResourcesConfig';

interface LunarTutorialSceneProps {
  onStepAdvance: () => void;
}

const TUTORIAL_FOLLOW_OFFSET: [number, number, number] = [-40, 50, 50];

export default memo(function TutorialResourcesScene({ onStepAdvance }: LunarTutorialSceneProps) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const fogColor = '#000000';
  const lightColor = '#ccccff';

  return (
    <>
      <Canvas
        style={{ width: '100vw', height: '100vh', background: fogColor, touchAction: 'none' }}
        camera={{ near: CANVAS_NEAR, far: CANVAS_FAR }}
        gl={{
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: TONE_MAPPING_EXPOSURE,
        }}
        shadows={true}
      >
        <fogExp2 attach="fog" args={[fogColor, 0.0005]} />
        <DefaultLighting
          color={lightColor}
          intensity={2}
          ambientIntensity={0.02}
          position={[0, 4000, 40000]}
        />
        <TutorialFollowCamera followTarget={shipPosRef} followOffset={TUTORIAL_FOLLOW_OFFSET} />
        <TutorialStepWatcher onStepAdvance={onStepAdvance} />
        <Suspense fallback={null}>
          <LunarLandscape />
          <LunarSettlement />
          <StartZoneAsteroidCluster
            center={TUTORIAL_RESOURCES_ASTEROID_CENTER}
            count={TUTORIAL_RESOURCES_ASTEROID_COUNT}
            innerRadius={TUTORIAL_RESOURCES_ASTEROID_INNER_RADIUS}
            outerRadius={TUTORIAL_RESOURCES_ASTEROID_OUTER_RADIUS}
            seed={TUTORIAL_RESOURCES_ASTEROID_SEED}
            registerCollidables
            collidableIdPrefix={TUTORIAL_RESOURCES_ASTEROID_COLLIDABLE_PREFIX}
          />
          <Spaceship
            url="/shuttle-low-british.glb"
            shipGroupRef={spaceshipGroupRef}
            initialPosition={[0, 0, 0]}
            scale={1}
            initialVelocity={[0, 0, 20]}
            shipParticleCloudProps={{
              count: SHIP_PARTICLE_COUNT,
              enableSpeedGate: true,
              speedGateMin: SHIP_PARTICLE_SPEED_MIN,
              speedGateMax: SHIP_PARTICLE_SPEED_MAX,
            }}
          />
          <group position={[-1600, 0, 2000]}>
            <UBoat />
          </group>
          <RadiationZones radiationZones={RADIATION_ZONES} />
          <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
          <ProximityHighlight />
          <ScannerRangeRings />
        </Suspense>
        <CollisionDebug />
        <ShipDepthOfField saturation={-1} />
      </Canvas>
    </>
  );
});
