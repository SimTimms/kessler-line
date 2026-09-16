import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import { sceneCamera } from '../../context/CameraRef';
import SolarSystem from '../Planets/SolarSystem';
import SunGravity from '../Environment/SunGravity';
import { CANVAS_FOV } from '../../config/visualConfig';
import { PLANETARY_CONFIG } from './planetarySceneConfig';

function CameraCapture() {
  const { camera } = useThree();
  useEffect(() => {
    sceneCamera.current = camera;
    return () => {
      sceneCamera.current = null;
    };
  }, [camera]);
  return null;
}

export default function PlanetaryConfigScene() {
  const {
    fogColor,
    canvasNear,
    canvasFar,
    toneMappingExposure,
    solarSystemScale,
    cameraPosition,
  } = PLANETARY_CONFIG;

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
        position: [...cameraPosition],
        near: canvasNear,
        far: canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure,
      }}
    >
      <CameraCapture />
      <Perf position="top-left" />
      <fogExp2 attach="fog" args={[fogColor, 0.0000005]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 100, -1000]} intensity={3} color="#ff8819" />

      <Suspense fallback={null}>
        <SolarSystem scale={solarSystemScale} />
      </Suspense>
      <SunGravity />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan
        enableZoom
        enableRotate
      />
    </Canvas>
  );
}
