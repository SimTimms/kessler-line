import { Suspense, memo, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialStepWatcher from './TutorialStepWatcher';
import { shipPosRef } from '../../context/ShipPos';
import { scrapperIntroActive } from '../../context/CinematicState';
import { CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import TutorialFollowCamera from './TutorialFollowCamera';
import DefaultLighting from '../DefaultLighting';
import LunarLandscape from './LunarLandscape';
import LunarSettlement from './LunarSettlement';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import LaserRay from '../Combat/LaserRay';
import {
  SHIP_PARTICLE_COUNT,
  SHIP_PARTICLE_SPEED_MIN,
  SHIP_PARTICLE_SPEED_MAX,
} from '../../config/particleConfig';

// Directional light that tracks the ship so the shadow frustum always covers it.
// The light sits at a fixed offset above-and-behind the ship; its target stays
// on the ship, keeping the shadow angle consistent regardless of position.
function ShipShadowLight({ intensity, color }: { intensity: number; color: string }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();

  useEffect(() => {
    // The directional light target must be in the scene for updateMatrixWorld to work.
    if (lightRef.current) scene.add(lightRef.current.target);
    return () => {
      if (lightRef.current) scene.remove(lightRef.current.target);
    };
  }, [scene]);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const { x, z } = shipPosRef.current;
    light.position.set(x + 150, 250, z + 80);
    light.target.position.set(x, 0, z);
    light.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={intensity}
      color={color}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-120}
      shadow-camera-right={120}
      shadow-camera-top={120}
      shadow-camera-bottom={-120}
      shadow-camera-near={10}
      shadow-camera-far={600}
      shadow-bias={-0.001}
    />
  );
}

interface Props {
  onStepAdvance: () => void;
}

// Stable reference — defined outside the component so TutorialFollowCamera's
// useEffect([followOffset]) does not re-fire on step-driven re-renders.
const TUTORIAL_FOLLOW_OFFSET: [number, number, number] = [-40, 50, 50];

export default memo(function TutorialScene({ onStepAdvance }: Props) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);

  const fogColor = '#000000';
  const lightColor = '#ccccff';

  useEffect(() => {
    // Tutorial runs as a standalone sandbox: keep core physics/camera behavior
    // but disable the main-scene scrapper cinematic lock-in.
    scrapperIntroActive.current = false;
  }, []);

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
        <ShipShadowLight intensity={0.5} color={fogColor} />
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
          <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
        </Suspense>
        <ShipDepthOfField />
      </Canvas>
    </>
  );
});
