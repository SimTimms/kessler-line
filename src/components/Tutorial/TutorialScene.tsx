import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
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

interface Props {
  onStepAdvance: () => void;
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
          <group position={[0, -50, 0]}>
            <SpaceStation />
          </group>
          <Spaceship
            url="/shuttle.glb"
            shipGroupRef={spaceshipGroupRef}
            initialPosition={[0, 0, 0]}
            scale={0.5}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
