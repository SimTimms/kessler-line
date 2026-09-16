import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import DustCloud from '../../components/DustCloud/DustCloud';
import CollisionPhysicsTestRig from '../../components/Debug/CollisionPhysicsTestRig';
import CollisionDebug from '../../components/Debug/CollisionDebug';
import Spaceship from '../../components/Ship/Spaceship';
import { SpaceshipConfig } from './SpaceshipConfig';
import { CANVAS_FOV } from '../../config/visualConfig';
import VolumetricFog from '../../components/VolumetricFog/VolumetricFog';
//this is a hack to get the camera reference into the context
//it is used to get the camera position for the HUD
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
        fov: CANVAS_FOV,
        position: [...SpaceshipConfig.cameraPosition],
        near: SpaceshipConfig.scene.canvasNear,
        far: SpaceshipConfig.scene.canvasFar,
      }}
      gl={{
        //reduce z-fighting by using logarithmic depth buffer
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: SpaceshipConfig.scene.toneMappingExposure,
      }}
      dpr={[0.5, 1]}
      shadows={true}
    >
      <Perf position="top-left" />
      <CameraCapture />
      <fogExp2 attach="fog" args={[SpaceshipConfig.scene.fogColor, 0.000001]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[140, 100, 240]} intensity={14.4} color="#ff6600" />
      <directionalLight position={[-140, 10, 240]} intensity={4.4} color="#ffffff" />
      <VolumetricFog
        position={[0, 0, 0]}
        radius={100}
        color="#ff00ff"
        density={10.6}
        steps={24}
        octaves={3}
      />
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
        particleSize={10000}
        radialSpread={0}
        yInitial={SpaceshipConfig.dustCloud.yInitial}
        colors={[
          new THREE.Color('#ff0000'),
          new THREE.Color('#ff0000'),
          new THREE.Color('#ff0000'),
        ]}
        opacity={0.2}
      />
      {/* used to fire collision objects at the ship */}
      <CollisionPhysicsTestRig
        enabled
        defaultAimPosition={SpaceshipConfig.targetPosition}
        preferredTargetId={SpaceshipConfig.targetScan.id}
      />
      {/* used to debug the collision objects */}
      <CollisionDebug
        visible={showCollisionDebug}
        attachToObjects
        includeIds={[SpaceshipConfig.collisionId, SpaceshipConfig.targetScan.id]}
        includeIdPrefixes={['debug-collision-test-']}
      />
    </Canvas>
  );
}
