import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import Spaceship from '../Ship/Spaceship';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import DustCloud from '../DustCloud/DustCloud';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import GravityTestPlanet from './GravityTestPlanet';
import NavTargetProbe from './NavTargetProbe';
import BodyPhysics from '../BodyPhysics/BodyPhysics';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import {
  CANVAS_FOV,
  CANVAS_NEAR,
  CANVAS_FAR,
  TONE_MAPPING_EXPOSURE,
} from '../../config/visualConfig';

const NAV_SCENE_FOG = '#000000';

interface ShipNavigationConfigSceneProps {
  gravityEnabled?: boolean;
}

export default function ShipNavigationConfigScene({
  gravityEnabled = true,
}: ShipNavigationConfigSceneProps) {
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
        zoomMax={820}
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
          url="/shuttle-low-british.glb"
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
        {gravityEnabled ? <GravityTestPlanet planetId="nav-config-planet" /> : null}
        {gravityEnabled ? (
          <GravityTestPlanet
            planetId="nav-config-planet-2"
            planetPosition={[4800, -2000, -2600]}
            planetRadius={900}
            planetMu={18_000_000}
            planetSoi={9000}
            planetOrbitAlt={1600}
            planetColor="#ff0000"
          />
        ) : null}
        <NavTargetProbe
          id="nav-config-probe-alpha"
          label="Nav Probe Alpha"
          position={[2400, 0, -1600]}
          color="#00d1ff"
        />
        <NavTargetProbe
          id="nav-config-probe-beta"
          label="Nav Probe Beta"
          position={[-1800, 0, 3200]}
          color="#ffbb33"
        />
      </Suspense>
      <BodyPhysics />
      <SharedInteractionSceneTools />
      <DustCloud radius={5000} particleSize={450} radialSpread={9} yInitial={-900} />
    </Canvas>
  );
}
