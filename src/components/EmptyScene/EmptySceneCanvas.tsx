import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import { shipPosRef } from '../../context/ShipPos';
import DefaultLighting from '../DefaultLighting';
import { useRef } from 'react';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';

const CAMERA_OFFSET: [number, number, number] = [0, 14, -40];

export default function EmptySceneCanvas() {
  const dummyRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000000',
        touchAction: 'none',
      }}
      camera={{
        position: [...CAMERA_OFFSET],
        near: 0.01,
        far: 100_000_000,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
      }}
    >
      <DefaultLighting />
      <TutorialFollowCamera
        followTarget={shipPosRef}
        followOffset={CAMERA_OFFSET}
        attachTo={dummyRef}
        flattenBanking
        lockPolarAngle
      />
      <SharedInteractionSceneTools showHoverTools={false} showScannerTools={false} />
    </Canvas>
  );
}
