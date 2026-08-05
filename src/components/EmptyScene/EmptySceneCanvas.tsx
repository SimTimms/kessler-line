import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import { shipPosRef } from '../../context/ShipPos';
import DefaultLighting from '../DefaultLighting';
import { useRef } from 'react';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { CANVAS_FOV, CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';

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
        fov: CANVAS_FOV,
        position: [...CAMERA_OFFSET],
        near: CANVAS_NEAR,
        far: CANVAS_FAR,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: TONE_MAPPING_EXPOSURE,
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
