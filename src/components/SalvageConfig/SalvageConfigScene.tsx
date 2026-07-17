import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import DustCloud from '../DustCloud/DustCloud';
import LandingPad from '../WorldObjects/LandingPad';
import CargoContainer from '../CargoContainer/CargoContainer';
import Asteroid from '../Asteroid/Asteroid';
import BackgroundGarbageScow from '../Ship/BackgroundGarbageScow';
import GarbageScowDroneFleet from '../NPCs/GarbageScowDroneFleet';
import { SalvageConfigData } from './SalvageConfigFile';
import GarbageScow from '../Ship/GarbageScow';
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

  const { scene, dustCloud, dock, cargoContainer, asteroids, backgroundScow, scowDroneFleet } =
    SalvageConfigData;

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
      {/* <Perf position="top-left" /> */}
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
      {/* <axesHelper args={[180]} /> */}

      <Suspense fallback={null}>
        <GarbageScow
          url={'/space_garbage_truck.glb'}
          initialPosition={[0, 1.2, 0]}
          initialRotation={[0, 0, 0]}
          scale={4}
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
        <Asteroid
          key="salvage-asteroid-near"
          position={[45, 0, -55]}
          rotation={[0.2, 0.8, 0.1]}
          scale={18}
          mineableId="salvage-asteroid-near"
          label="Mineral Asteroid"
        />
        <group position={dock.position}>
          <LandingPad
            id={dock.id}
            label={dock.label}
            scale={SalvageConfigData.landingPadScale}
            dock={dock.dock}
            landingPadThreshold={SalvageConfigData.landingPadThreshold}
            debugJumpDockOnClick
          />
          <Asteroid
            key={`salvage-asteroid-mineable`}
            position={[-150, -480, -70]}
            rotation={[0, 0, 0]}
            scale={260}
            mineableId="salvage-asteroid-a"
            label="Mineral Asteroid"
          />
        </group>
        <CargoContainer
          id={cargoContainer.id}
          label={cargoContainer.label}
          position={cargoContainer.position}
          rotation={cargoContainer.rotation}
          scale={cargoContainer.scale}
          dock={cargoContainer.dock}
          showCaptureMesh
          debugJumpDockOnClick
        />
        {asteroids.map((asteroid, index) => (
          <Asteroid
            key={`salvage-asteroid-${index}`}
            position={asteroid.position}
            rotation={asteroid.rotation}
            scale={asteroid.scale}
          />
        ))}

        <GarbageScowDroneFleet
          url={scowDroneFleet.url}
          count={scowDroneFleet.count}
          scale={scowDroneFleet.scale}
          spawnCenter={scowDroneFleet.spawnCenter}
          spawnRadius={scowDroneFleet.spawnRadius}
          waypoints={scowDroneFleet.waypoints}
        />
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
      <Suspense fallback={null}>
        <DustCloud
          radius={dustCloud.radius}
          particleSize={1500}
          radialSpread={dustCloud.radialSpread}
          yInitial={-700}
          opacity={dustCloud.opacity}
          colors={[...dustCloud.colors]}
        />
      </Suspense>
    </Canvas>
  );
}
