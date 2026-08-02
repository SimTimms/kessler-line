import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import DustCloud from '../DustCloud/DustCloud';
import CollisionPhysicsTestRig from '../Debug/CollisionPhysicsTestRig';
import CollisionDebug from '../Debug/CollisionDebug';
import Spaceship from '../Ship/Spaceship';
import { SpaceshipConfig } from './SpaceshipConfig';

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

interface ModelConfigSceneProps {
  showCollisionDebug?: boolean;
}

export default function ModelConfigScene({ showCollisionDebug = false }: ModelConfigSceneProps) {
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
        background: SpaceshipConfig.scene.fogColor,
        touchAction: 'none',
      }}
      camera={{
        position: [...SpaceshipConfig.cameraPosition],
        near: SpaceshipConfig.scene.canvasNear,
        far: SpaceshipConfig.scene.canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: SpaceshipConfig.scene.toneMappingExposure,
      }}
      shadows={true}
    >
      <CameraCapture />
      <Perf position="top-left" />
      <fogExp2 attach="fog" args={[SpaceshipConfig.scene.fogColor, 0.000001]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[280, 20, 240]} intensity={14.4} color="#ffaaff" />
      <gridHelper
        args={[SpaceshipConfig.gridSize, SpaceshipConfig.gridDivisions, '#006666', '#003333']}
      />
      <axesHelper args={[120]} />
      <Suspense fallback={null}>
        <Spaceship
          url={SpaceshipConfig.url}
          initialPosition={SpaceshipConfig.initialPosition}
          initialRotation={SpaceshipConfig.initialRotation}
          scale={SpaceshipConfig.scale}
          modelRotation={SpaceshipConfig.modelRotation}
          initialVelocity={SpaceshipConfig.initialVelocity}
          collisionId={SpaceshipConfig.collisionId}
          shipParticleCloudProps={SpaceshipConfig.shipParticleCloudProps}
          physicsOptions={SpaceshipConfig.physicsOptions}
        />
      </Suspense>
      <SharedInteractionSceneTools />
      <OrbitControls
        makeDefault
        target={[
          SpaceshipConfig.cameraTarget[0],
          SpaceshipConfig.cameraTarget[1],
          SpaceshipConfig.cameraTarget[2],
        ]}
        enablePan
        enableZoom
        enableRotate
      />
      <DustCloud
        radius={SpaceshipConfig.dustCloud.radius}
        particleSize={SpaceshipConfig.dustCloud.particleSize}
        radialSpread={SpaceshipConfig.dustCloud.radialSpread}
        yInitial={SpaceshipConfig.dustCloud.yInitial}
      />
      <CollisionPhysicsTestRig
        enabled
        showPanel={false}
        defaultAimPosition={SpaceshipConfig.targetPosition}
        preferredTargetId={SpaceshipConfig.targetScan.id}
      />
      <CollisionDebug
        visible={showCollisionDebug}
        attachToObjects
        includeIds={[SpaceshipConfig.collisionId, SpaceshipConfig.targetScan.id]}
        includeIdPrefixes={['debug-collision-test-']}
      />
    </Canvas>
  );
}
