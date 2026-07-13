import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import UBoat from '../UBoat/UBoat';
import { ASTEROID_DOCK_CONFIG } from '../../config/docks/asteroidDockConfig';
import { UBoatConfig } from './UBoatConfig';
import { Thruster } from '../Thruster';
import {
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
} from '../../config/keybindings';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import DustCloud from '../DustCloud/DustCloud';
import CollisionPhysicsTestRig from '../Debug/CollisionPhysicsTestRig';
import CollisionDebug from '../Debug/CollisionDebug';

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
      scale={UBoatConfig.targetScale}
      position={UBoatConfig.targetPosition}
      scan={UBoatConfig.targetScan}
      impactVents
      flyable
      physicsMode="ship"
      initialFuel={100}
      dockingBay={{
        stationId: 'model-config-target',
        dimensions: [2, 1, 1.3],
        position: [
          -4 / (UBoatConfig.targetScale * 0.56),
          -0.8,
          1110 / (UBoatConfig.targetScale * 2.1),
        ],
        scale: 3,
        dock: ASTEROID_DOCK_CONFIG,
        debugDockOnClick: true,
      }}
      shipPhysicsOptions={{
        enabled: true,
        inputEnabled: true,
        thrusterPhysicsEnabled: true,
        orbitalPhysicsEnabled: true,
        dockingPhysicsEnabled: true,
        yawPivotLocal: [0, 0, 0],
      }}
    >
      <Thruster
        position={UBoatConfig.mainThrusterPosition}
        keyCode={KEY_THRUST_REVERSE}
        kind="main"
        fuelConsumptionMultiplier={1}
      />
      <Thruster
        position={UBoatConfig.forwardRcsPosition}
        rotation={[0, Math.PI, 0]}
        keyCode={KEY_THRUST_FORWARD}
        kind="rcs"
        fuelConsumptionMultiplier={1}
      />
      <Thruster
        position={UBoatConfig.yawLeftRcsPosition}
        thrustDirection={[1, 0, 0]}
        keyCode={KEY_YAW_LEFT}
        kind="rcs"
        yaw
        yawSign={1}
        fuelConsumptionMultiplier={0.5}
      />
      <Thruster
        position={UBoatConfig.yawRightRcsPosition}
        thrustDirection={[-1, 0, 0]}
        keyCode={KEY_YAW_RIGHT}
        kind="rcs"
        yaw
        yawSign={-1}
        fuelConsumptionMultiplier={0.5}
      />
    </UBoat>
  );
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
        background: UBoatConfig.scene.fogColor,
        touchAction: 'none',
      }}
      camera={{
        position: [...UBoatConfig.cameraPosition],
        near: UBoatConfig.scene.canvasNear,
        far: UBoatConfig.scene.canvasFar,
      }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: UBoatConfig.scene.toneMappingExposure,
      }}
      shadows={true}
    >
      <CameraCapture />
      <Perf position="top-left" />
      <fogExp2 attach="fog" args={[UBoatConfig.scene.fogColor, 0.000001]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[280, 20, 240]} intensity={14.4} color="#ffaaff" />
      <gridHelper args={[UBoatConfig.gridSize, UBoatConfig.gridDivisions, '#006666', '#003333']} />
      <axesHelper args={[120]} />
      <Suspense fallback={null}>
        <ModelConfigTarget />
      </Suspense>
      <SharedInteractionSceneTools />
      <OrbitControls
        makeDefault
        target={[
          UBoatConfig.cameraTarget[0],
          UBoatConfig.cameraTarget[1],
          UBoatConfig.cameraTarget[2],
        ]}
        enablePan
        enableZoom
        enableRotate
      />
      <DustCloud radius={5000} particleSize={2500000} radialSpread={9} yInitial={-1000} />
      <CollisionPhysicsTestRig
        enabled
        showPanel={false}
        defaultAimPosition={UBoatConfig.targetPosition}
        preferredTargetId={UBoatConfig.targetScan.id}
      />
      <CollisionDebug
        visible={showCollisionDebug}
        attachToObjects
        includeIds={['model-config-target', 'docking-bay-model-config-target']}
        includeIdPrefixes={['debug-collision-test-']}
      />
    </Canvas>
  );
}
