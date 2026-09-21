import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import Spaceship from '../../components/Ship/Spaceship';
import SharedInteractionSceneTools from '../../components/SharedInteractionSceneTools';
import DustCloud from '../../components/DustCloud/DustCloud';
import TutorialFollowCamera from '../../components/TutorialShared/TutorialFollowCamera';
import GravityTestPlanet from './GravityTestPlanet';
import BodyPhysics from '../../components/BodyPhysics/BodyPhysics';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import {
  CANVAS_FOV,
  CANVAS_NEAR,
  CANVAS_FAR,
  TONE_MAPPING_EXPOSURE,
} from '../../config/visualConfig';

const NAV_SCENE_FOG = '#000000';

const PLANET_1_POS: [number, number, number] = [-2000, -1000, 0];
const PLANET_1_MASS = 10000;

interface ShipNavigationConfigSceneProps {
  gravityEnabled?: boolean;
}

export default function ShipNavigationConfigScene({}: ShipNavigationConfigSceneProps) {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    shipPosRef.current.set(0, 0, 0);
    minimapShipPosition.set(0, 0, 0);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      style={{
        width: '100vw',
        height: '100vh',
        background: NAV_SCENE_FOG,
        touchAction: 'none',
      }}
      camera={{ fov: CANVAS_FOV, position: [0, 120, 280], near: CANVAS_NEAR, far: CANVAS_FAR }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: TONE_MAPPING_EXPOSURE,
      }}
      shadows
    >
      <Perf position="top-left" />
      <fogExp2 attach="fog" args={[NAV_SCENE_FOG, 0.0000007]} />
      <TutorialFollowCamera
        followTarget={shipPosRef}
        followOffset={[0, 100, 120]}
        zoomMax={20000}
        attachTo={spaceshipGroupRef}
        flattenBanking
        lockPolarAngle
      />
      <ambientLight intensity={0.85} />
      <directionalLight position={[220, 120, 160]} intensity={8} color="#dde7ff" />
      <gridHelper args={[12000, 80, '#2b6a8a', '#17394d']} />
      <axesHelper args={[200]} />

      <Suspense fallback={null}>
        <Spaceship
          url="/models/shuttle-low-british.glb"
          shipGroupRef={spaceshipGroupRef}
          initialPosition={[0, 0, 0]}
          initialRotation={[0, 0, 0]}
          scale={1}
          initialVelocity={[0, 0, 0]}
          shipParticleCloudProps={{
            count: 80,
            enableSpeedGate: true,
            speedGateMin: 100000,
            speedGateMax: 100000,
          }}
          physicsOptions={{
            enabled: true,
            inputEnabled: true,
            thrusterPhysicsEnabled: true,
            orbitalPhysicsEnabled: true,
            dockingPhysicsEnabled: false,
          }}
        />
        <GravityTestPlanet
          planetId="nav-config-planet"
          planetPosition={PLANET_1_POS}
          planetMass={PLANET_1_MASS}
        />
      </Suspense>
      <BodyPhysics />
      <SharedInteractionSceneTools />
      <DustCloud radius={5000} particleSize={450} radialSpread={9} yInitial={-900} />
    </Canvas>
  );
}
