import { Suspense, useLayoutEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../Ship/Spaceship';
import TutorialFollowCamera from '../TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import DefaultLighting from '../DefaultLighting';
import LaserRay from '../Combat/LaserRay';
import PlayerBullets from '../Combat/PlayerBullets';
import ProximityHighlight from '../Proximity/ProximityHighlight';
import ScannerRangeRings from '../Scanners/ScannerRangeRings';
import { ShipDepthOfField } from '../Ship/ShipDepthOfField';
import SolarSystem from '../Planets/SolarSystem';
import SunGravity from '../Environment/SunGravity';
import { BodyOrbit } from '../BodyOrbit';
import { SANDBOX_ASTEROID_ORBIT, SANDBOX_ASTEROID_RADIO, SANDBOX_CONFIG, SANDBOX_BATTLESHIP_ORBIT  } from './sandboxConfig';
import { Asteroid } from '../TutorialResources/Asteroid';
import { Station } from '../Station/Station';
import DustCloud from '../DustCloud/DustCloud';
import {getPlanetPosition, } from '../../config/planetPosition';
import BattleshipBritish from '../BattleshipBritish/BattleshipBritish';
import { TUTORIAL_BATTLESHIP_SCAN,  } from '../../config/battleshipScanConfig';
import { TUTORIAL_BATTLESHIP_RADIO_BROADCAST } from '../TutorialRadio/tutorialRadioConfig';
export default function SandboxScene() {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);
  const {
    spawnCameraPosition,
    fogColor,
    lightColor,
    sandboxInitialVelocity,
    tutorialFollowOffset,
    canvasNear,
    canvasFar,
    toneMappingExposure,
    applySandboxSpawn,
    tutorialShipOrbitRadius,
    tutorialShipSurfaceClearance,
    planetImpactCameraHoldMaxAltitude,
    tutorialCameraZoomMax,
    tutorialShipInitialPosition,
    tutorialShipInitialRotation,
    solarSystemScale,
    shipParticleCount,
  } = SANDBOX_CONFIG;

  useLayoutEffect(() => {
    applySandboxSpawn(spaceshipGroupRef.current);
  }, [tutorialShipOrbitRadius]);

  const marsPosition = getPlanetPosition('Mars');
  const dustPosition = new THREE.Vector3(marsPosition.x, -1000000, marsPosition.z);
  return (
    <>
      <Canvas
        style={{
          width: '100vw',
          height: '100vh',
          background: SANDBOX_CONFIG.fogColor,
          touchAction: 'none',
        }}
        camera={{
          position: [spawnCameraPosition.x, spawnCameraPosition.y, spawnCameraPosition.z],
          near: canvasNear,
          far: canvasFar,
        }}
        gl={{
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure,
        }}
        shadows={true}
      >
        <fogExp2 attach="fog" args={[fogColor, 0.0000005]} />
        <DefaultLighting
          color={lightColor}
          intensity={2}
          ambientIntensity={0.0002}
          position={[0, 0, -10000]}
        />
        <TutorialFollowCamera
          followTarget={shipPosRef}
          followOffset={tutorialFollowOffset}
          zoomMax={tutorialCameraZoomMax}
          attachTo={spaceshipGroupRef}
          flattenBanking
          planetImpactCameraHoldMaxAltitude={planetImpactCameraHoldMaxAltitude}
        />
        <Suspense fallback={null}>
          <Spaceship
            key={`${tutorialShipOrbitRadius}-${tutorialShipSurfaceClearance}`}
            url="/shuttle-low-british.glb"
            shipGroupRef={spaceshipGroupRef}
            initialPosition={tutorialShipInitialPosition}
            initialRotation={tutorialShipInitialRotation}
            scale={1}
            initialVelocity={sandboxInitialVelocity}
            shipParticleCloudProps={{
              count: shipParticleCount,
              enableSpeedGate: true,
              speedGateMin: 100000,
              speedGateMax: 100000,
            }}
          />
          <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
          <PlayerBullets shipGroupRef={spaceshipGroupRef} />
          <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />
          <SolarSystem scale={solarSystemScale} />
        </Suspense>
        <SunGravity />
        <ProximityHighlight />
        <ScannerRangeRings />
        <ShipDepthOfField saturation={-0.8} />
        <BodyOrbit {...SANDBOX_ASTEROID_ORBIT}>
          <Asteroid scale={1000} radioBroadcast={SANDBOX_ASTEROID_RADIO} />
        </BodyOrbit>
        <BodyOrbit {...SANDBOX_ASTEROID_ORBIT}>
          <Station scale={2000} radioBroadcast={SANDBOX_ASTEROID_RADIO} />
        </BodyOrbit>
        <group position={dustPosition}>
          <DustCloud  yInitial={-100000}/>
        </group>
          <BodyOrbit {...SANDBOX_BATTLESHIP_ORBIT}>
          <BattleshipBritish
            scan={TUTORIAL_BATTLESHIP_SCAN}
            radioBroadcast={TUTORIAL_BATTLESHIP_RADIO_BROADCAST}
          />
          </BodyOrbit>
      </Canvas>
    </>
  );
}
