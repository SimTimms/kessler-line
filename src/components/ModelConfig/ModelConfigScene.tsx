import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import UBoat from '../UBoat/UBoat';
import { ASTEROID_DOCK_CONFIG } from '../../config/docks/asteroidDockConfig';
import {
  MODEL_CONFIG_CAMERA_POSITION,
  MODEL_CONFIG_CAMERA_TARGET,
  MODEL_CONFIG_GRID_DIVISIONS,
  MODEL_CONFIG_GRID_SIZE,
  MODEL_CONFIG_TARGET_POSITION,
  MODEL_CONFIG_TARGET_SCALE,
  MODEL_CONFIG_TARGET_SCAN,
  MODEL_CONFIG_SCENE,
} from './modelConfigConfig';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import DustCloud from '../DustCloud/DustCloud';

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

function ModelConfigTarget() {
  return (
    <UBoat
      scale={MODEL_CONFIG_TARGET_SCALE}
      position={MODEL_CONFIG_TARGET_POSITION}
      scan={MODEL_CONFIG_TARGET_SCAN}
      dockingBay={{
        stationId: 'model-config-target',
        dimensions: [2, 0.6, 1.3],
        position: [
          -1110 / (MODEL_CONFIG_TARGET_SCALE * 2.18),
          -4 / (MODEL_CONFIG_TARGET_SCALE * 2.18),
          0,
        ],
        scale: 3,
        dock: ASTEROID_DOCK_CONFIG,
        debugDockOnClick: true,
      }}
    />
  );
}

export default function ModelConfigScene() {
  useEffect(() => {
    shipPosRef.current.set(0, 0, 0);
    minimapShipPosition.set(0, 0, 0);
  }, []);

  useEffect(() => {
    const onRequestUndock = () => {
      window.dispatchEvent(new CustomEvent('ShipUndocked'));
    };
    window.addEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    return () => {
      window.removeEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    };
  }, []);

  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        background: MODEL_CONFIG_SCENE.fogColor,
        touchAction: 'none',
      }}
      camera={{
        position: [...MODEL_CONFIG_CAMERA_POSITION],
        near: MODEL_CONFIG_SCENE.canvasNear,
        far: MODEL_CONFIG_SCENE.canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: MODEL_CONFIG_SCENE.toneMappingExposure,
      }}
      shadows={true}
    >
      <CameraCapture />
      <fogExp2 attach="fog" args={[MODEL_CONFIG_SCENE.fogColor, 0.000001]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[280, 20, 240]} intensity={14.4} color="#ffaaff" />
      <gridHelper
        args={[MODEL_CONFIG_GRID_SIZE, MODEL_CONFIG_GRID_DIVISIONS, '#006666', '#003333']}
      />
      <axesHelper args={[120]} />
      <Suspense fallback={null}>
        <ModelConfigTarget />
      </Suspense>
      <SharedInteractionSceneTools />
      <OrbitControls
        makeDefault
        target={[
          MODEL_CONFIG_CAMERA_TARGET[0],
          MODEL_CONFIG_CAMERA_TARGET[1],
          MODEL_CONFIG_CAMERA_TARGET[2],
        ]}
        enablePan
        enableZoom
        enableRotate
      />
      <DustCloud radius={5000} particleSize={2500000} radialSpread={9} yInitial={-1000} />
    </Canvas>
  );
}
