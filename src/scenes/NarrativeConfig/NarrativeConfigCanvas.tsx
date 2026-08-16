import { CANVAS_FOV } from '../../config/visualConfig';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { NARRATIVE_CONFIG } from './narrativeSceneConfig';

export default function NarrativeConfigCanvas({ children }: { children: React.ReactNode }) {
  const { fogColor, canvasNear, canvasFar, toneMappingExposure, tutorialFollowOffset } =
    NARRATIVE_CONFIG;
  return (
    <Canvas
      dpr={[1, 1.5]}
      style={{
        width: '100vw',
        height: '100vh',
        background: fogColor,
        touchAction: 'none',
      }}
      camera={{
        fov: CANVAS_FOV,
        position: [...tutorialFollowOffset],
        near: canvasNear,
        far: canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure,
      }}
      shadows={true}
    >
      {children}
    </Canvas>
  );
}
