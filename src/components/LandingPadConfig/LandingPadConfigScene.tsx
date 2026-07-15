import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import { ASTEROID_DOCK_CONFIG } from '../../config/docks/asteroidDockConfig';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import DustCloud from '../DustCloud/DustCloud';
import LandingPad from '../WorldObjects/LandingPad';
import { LandingPadConfig } from './LandingPadConfigFile';
import Spaceship from '../Ship/Spaceship';

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

export default function LandingPadConfigScene() {
  const landingPadConfigCameraPosition: [number, number, number] = [0, 26, 84];
  const landingPadConfigCameraTarget: [number, number, number] = [0, 0, 38];

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

  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        background: LandingPadConfig.scene.fogColor,
        touchAction: 'none',
      }}
      camera={{
        position: [...landingPadConfigCameraPosition],
        near: LandingPadConfig.scene.canvasNear,
        far: LandingPadConfig.scene.canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: LandingPadConfig.scene.toneMappingExposure,
      }}
      shadows={true}
    >
      <CameraCapture />
      <Perf position="top-left" />
      <fogExp2 attach="fog" args={[LandingPadConfig.scene.fogColor, 0.000001]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[180, 120, 120]} intensity={16} color="#ffd8ff" />
      <directionalLight position={[-120, 80, -80]} intensity={6} color="#88bbff" />
      <gridHelper
        args={[LandingPadConfig.gridSize, LandingPadConfig.gridDivisions, '#00aaaa', '#005555']}
      />
      <axesHelper args={[180]} />

      <Suspense fallback={null}>
        <Spaceship
          url="/shuttle-low-british.glb"
          initialPosition={[0, 1.2, 0]}
          initialRotation={[0, 0, 0]}
          scale={1}
          initialVelocity={[0, 0, 0]}
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
        <group position={LandingPadConfig.landingPadOffsetFromSpawn}>
          <LandingPad
            scale={LandingPadConfig.landingPadScale}
            dock={ASTEROID_DOCK_CONFIG}
            landingPadThreshold={LandingPadConfig.landingPadThreshold}
          />
        </group>
      </Suspense>
      <SharedInteractionSceneTools />
      <OrbitControls
        makeDefault
        target={[
          landingPadConfigCameraTarget[0],
          landingPadConfigCameraTarget[1],
          landingPadConfigCameraTarget[2],
        ]}
        enablePan
        enableZoom
        enableRotate
      />
      <DustCloud
        radius={2200}
        particleSize={900000}
        radialSpread={LandingPadConfig.dustCloud.radialSpread}
        yInitial={-160}
      />
    </Canvas>
  );
}
