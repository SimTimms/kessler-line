import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import { SalvageConfigData } from './SalvageConfigFile';
import SalvageField from './SalvageField';
import Spaceship from '../Ship/Spaceship';
import { GARBAGE_SCOW_MODULES } from '../../config/miningConfig';

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

export default function SalvageConfigScene() {
  useEffect(() => {
    const onRequestUndock = () => {
      window.dispatchEvent(new CustomEvent('ShipUndocked'));
    };
    window.addEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    return () => {
      window.removeEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    };
  }, []);

  useEffect(() => {
    shipPosRef.current.set(0, 0, 0);
    minimapShipPosition.set(0, 0, 0);
  }, []);

  const { scene } = SalvageConfigData;

  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        background: scene.fogColor,
        touchAction: 'none',
      }}
      camera={{
        position: [...SalvageConfigData.cameraPosition],
        near: scene.canvasNear,
        far: scene.canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: scene.toneMappingExposure,
      }}
      shadows={true}
    >
      <CameraCapture />
      <fogExp2 attach="fog" args={[scene.fogColor, 0.000001]} />
      <ambientLight intensity={scene.ambientIntensity} />
      <directionalLight
        position={scene.keyLight.position}
        intensity={scene.keyLight.intensity}
        color={scene.keyLight.color}
      />
      <directionalLight
        position={scene.fillLight.position}
        intensity={scene.fillLight.intensity}
        color={scene.fillLight.color}
      />
      <gridHelper
        args={[SalvageConfigData.gridSize, SalvageConfigData.gridDivisions, '#aa7744', '#553311']}
      />

      <Suspense fallback={null}>
        <Spaceship
          url={'/shuttle-low-british.glb'}
          initialPosition={[0, 1.2, 0]}
          initialRotation={[0, 0, 0]}
          scale={1}
          initialVelocity={[0, 0, 0]}
          modulesInstalled={GARBAGE_SCOW_MODULES}
          shipParticleCloudProps={{
            count: 100,
            enableSpeedGate: true,
            speedGateMin: 100000,
            speedGateMax: 100000,
          }}
          physicsOptions={{
            enabled: true,
            inputEnabled: true,
            thrusterPhysicsEnabled: true,
            orbitalPhysicsEnabled: true,
            dockingPhysicsEnabled: true,
          }}
        />
        <SalvageField origin={[0, 0, 0]} debugJumpDockOnClick />
      </Suspense>
      <SharedInteractionSceneTools />
      <OrbitControls
        makeDefault
        target={[
          SalvageConfigData.cameraTarget[0],
          SalvageConfigData.cameraTarget[1],
          SalvageConfigData.cameraTarget[2],
        ]}
        enablePan
        enableZoom
        enableRotate
      />
    </Canvas>
  );
}
