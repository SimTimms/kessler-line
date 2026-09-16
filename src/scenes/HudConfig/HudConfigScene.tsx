import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Spaceship from '../../components/Ship/Spaceship';
import TutorialFollowCamera from '../../components/TutorialShared/TutorialFollowCamera';
import TutorialNavShipIndicator from '../../components/TutorialShared/TutorialNavShipIndicator';
import { shipPosRef } from '../../context/ShipPos';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import DefaultLighting from '../../components/DefaultLighting';
import LaserRay from '../../components/Combat/LaserRay';
import PlayerBullets from '../../components/Combat/PlayerBullets';
import PlayerCannonHitDamage from '../../components/Combat/PlayerCannonHitDamage';
import BreakupVfx from '../../components/Combat/BreakupVfx';
import SharedInteractionSceneTools from '../../components/SharedInteractionSceneTools';
import { ShipDepthOfField } from '../../components/Ship/ShipDepthOfField';
import SpaceParticles from '../../components/Environment/SpaceParticles';
import { FloatingOrigin } from '../../components/Environment/FloatingOrigin';
import { SANDBOX_USE_FLOATING_ORIGIN } from '../../config/debugConfig';
import { GARBAGE_SCOW_MODULES } from '../../config/miningConfig';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import Asteroid from '../../components/Asteroid/Asteroid';
import DustCloud from '../../components/DustCloud/DustCloud';
import SalvageField from '../../scenes/SalvageConfig/SalvageField';
import { HUD_CONFIG, HUD_ID_PREFIX, getHudShipSpawn } from './hudSceneConfig';
import CameraAttachedCockpit from './CameraAttachedCockpit';
import { CANVAS_FOV } from '../../config/visualConfig';
// Secondary PIP chase view — disabled for now:
// import ShipNoseCamera from './ShipNoseCamera';
// import ChaseViewScissorPass from './ChaseViewScissorPass';
// import ShipChaseViewHud from './ShipChaseViewHud';

const CAMERA_FRAME_PRIORITY = SANDBOX_USE_FLOATING_ORIGIN ? 4 : 0;

export default function HudConfigScene() {
  const spaceshipGroupRef = useRef<THREE.Group | null>(null);

  const {
    fogColor,
    canvasNear,
    canvasFar,
    toneMappingExposure,
    tutorialFollowOffset,
    tutorialCameraZoomMax,
    planetImpactCameraHoldMaxAltitude,
    shipParticleCount,
    playerShipUrl,
    dustCloud,
    mineableAsteroids,
    salvageFieldOrigin,
    cameraCockpit,
  } = HUD_CONFIG;

  const shipSpawn = useMemo(() => getHudShipSpawn(), []);

  useEffect(() => {
    const onRequestUndock = () => {
      window.dispatchEvent(new CustomEvent('ShipUndocked'));
    };
    window.addEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    return () => {
      window.removeEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    };
  }, []);

  useLayoutEffect(() => {
    shipPosRef.current.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    minimapShipPosition.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    const group = spaceshipGroupRef.current;
    if (group) {
      group.position.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
      group.rotation.set(shipSpawn.rotation[0], shipSpawn.rotation[1], shipSpawn.rotation[2]);
    }
  }, [shipSpawn]);

  const worldContent = (
    <>
      <DefaultLighting
        color="#ffffff"
        intensity={10.2}
        ambientIntensity={3.3}
        position={[10000, 10000, -100]}
      />
      <SpaceParticles />
      <Suspense fallback={null}>
        <Spaceship
          url={playerShipUrl}
          shipGroupRef={spaceshipGroupRef}
          initialPosition={shipSpawn.position}
          initialRotation={shipSpawn.rotation}
          scale={1}
          initialVelocity={[0, 0, 0]}
          modulesInstalled={GARBAGE_SCOW_MODULES}
          shipParticleCloudProps={{
            count: shipParticleCount,
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
        <LaserRay shipGroupRef={spaceshipGroupRef} />
        <PlayerBullets shipGroupRef={spaceshipGroupRef} />
        <PlayerCannonHitDamage />
        <BreakupVfx />
        <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />

        {/* Berth, salvage bay, cargo container, berth-side mineable — from Salvage Config */}
        <SalvageField
          origin={salvageFieldOrigin}
          idPrefix={HUD_ID_PREFIX}
          showDecorativeAsteroids={false}
          showFreeMineables={false}
          showDroneFleet={false}
          showDustCloud={false}
        />

        {mineableAsteroids.map((asteroid) => (
          <Asteroid
            key={`${HUD_ID_PREFIX}${asteroid.id}`}
            position={asteroid.position}
            rotation={asteroid.rotation}
            scale={asteroid.scale}
            mineableId={`${HUD_ID_PREFIX}${asteroid.id}`}
            label={asteroid.label}
          />
        ))}
      </Suspense>

      <Suspense fallback={null}>
        <DustCloud
          radius={dustCloud.radius}
          particleSize={dustCloud.particleSize}
          radialSpread={dustCloud.radialSpread}
          yInitial={dustCloud.yInitial}
          opacity={dustCloud.opacity}
          colors={[...dustCloud.colors]}
        />
      </Suspense>
    </>
  );

  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        background: fogColor,
        touchAction: 'none',
      }}
      camera={{
        fov: CANVAS_FOV,
        position: [...tutorialFollowOffset],
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
      {/* Main view — same chase / follow camera as Combat Config */}
      <TutorialFollowCamera
        followTarget={shipPosRef}
        followOffset={tutorialFollowOffset}
        zoomMax={tutorialCameraZoomMax}
        attachTo={spaceshipGroupRef}
        flattenBanking
        lockPolarAngle
        planetImpactCameraHoldMaxAltitude={planetImpactCameraHoldMaxAltitude}
        framePriority={CAMERA_FRAME_PRIORITY}
      />
      <Suspense fallback={null}>
        <CameraAttachedCockpit
          url={cameraCockpit.url}
          localPosition={cameraCockpit.localPosition}
          localRotation={cameraCockpit.localRotation}
          scale={cameraCockpit.scale}
        />
      </Suspense>
      {SANDBOX_USE_FLOATING_ORIGIN ? <FloatingOrigin>{worldContent}</FloatingOrigin> : worldContent}
      <SharedInteractionSceneTools />
      <ShipDepthOfField saturation={0} />
    </Canvas>
  );
}
