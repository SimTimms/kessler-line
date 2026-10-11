import { Suspense } from 'react';
import Spaceship from '../../components/Ship/Spaceship';
import TutorialNavShipIndicator from '../../components/TutorialShared/TutorialNavShipIndicator';
import LaserRay from '../../components/Combat/LaserRay';
import PlayerBullets from '../../components/Combat/PlayerBullets';
import PlayerCannonHitDamage from '../../components/Combat/PlayerCannonHitDamage';
import BreakupVfx from '../../components/Combat/BreakupVfx';
import { GARBAGE_SCOW_MODULES } from '../../config/miningConfig';
import { NARRATIVE_CONFIG, NARRATIVE_DONINGTON_DOCK_ID } from './narrativeSceneConfig';
import * as THREE from 'three';

interface PlayerShipProps {
  effectiveSpawn: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  savedSpawn: {
    velocity: [number, number, number];
  };
  spaceshipGroupRef: React.RefObject<THREE.Group>;
  initialDockedTo: string | undefined;
}
export default function PlayerShip({
  effectiveSpawn,
  savedSpawn,
  spaceshipGroupRef,
  initialDockedTo,
}: PlayerShipProps) {
  const { shipParticleCount } = NARRATIVE_CONFIG;
  console.log('savedSpawn', savedSpawn);
  return (
    <Suspense fallback={null}>
      <Spaceship
        url="/models/shuttle-low-british.glb"
        shipGroupRef={spaceshipGroupRef}
        initialPosition={effectiveSpawn.position}
        initialRotation={effectiveSpawn.rotation}
        initialDockedTo={initialDockedTo}
        scale={1}
        initialVelocity={savedSpawn?.velocity ?? [0, 0, 0]}
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
      <LaserRay shipGroupRef={spaceshipGroupRef} detectSettlement />
      <PlayerBullets shipGroupRef={spaceshipGroupRef} />
      <PlayerCannonHitDamage />
      <BreakupVfx />
      <TutorialNavShipIndicator shipGroupRef={spaceshipGroupRef} />
    </Suspense>
  );
}
