import { Suspense, memo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialStepWatcher from './TutorialStepWatcher';
import { shipPosRef } from '../../context/ShipPos';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import TutorialFollowCamera from './TutorialFollowCamera';
import DefaultLighting from '../DefaultLighting';
import LunarLandscape from './LunarLandscape';
import LunarSettlement from './LunarSettlement';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../../config/particleConfig';

interface LunarTutorialSceneProps {
  onStepAdvance: () => void;
}

const TUTORIAL_FOLLOW_OFFSET: [number, number, number] = [-40, 50, 50];

export default memo(function LunarTutorialScene({ onStepAdvance }: LunarTutorialSceneProps) {
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
          intensity={1}
          ambientIntensity={0.2}
          position={[0, 4000, 40000]}
        />
        <TutorialFollowCamera followTarget={shipPosRef} followOffset={TUTORIAL_FOLLOW_OFFSET} />
        <TutorialStepWatcher onStepAdvance={onStepAdvance} />
        <Suspense fallback={null}>
          <LunarLandscape />
          <LunarSettlement />
          <Spaceship
            url="/shuttle-low.glb"
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
        </Suspense>
        <ShipDepthOfField />
      </Canvas>
    </>
  );
});
