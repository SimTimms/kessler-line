import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { START_DISTANCE_FROM_PLANET, START_PLANET } from '../../config/spawnConfig';
import { PLANETS } from '../Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';
import { selectTarget, flashTarget } from '../../context/TargetSelection';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import {
  scrapperWorldPos,
  scrapperWorldQuat,
  scrapperRetroFiring,
  scrapperForwardFiring,
} from '../../context/CinematicState';
import { setScrapperEngineHiss } from '../../sound/SoundManager';
import {
  SCRAPPER_CRUISE_SPEED,
  SCRAPPER_BRAKE_DECEL,
  SCRAPPER_BRAKE_TRIGGER_DIST,
  SCRAPPER_COLLIDER_HALF_EXTENTS,
  SCRAPPER_TURN_SPEED,
  SCRAPPER_INITIAL_ROTATION_Y,
} from '../../config/scrapperConfig';
import ScrapperThrusterFX from './ScrapperThrusterFX';

interface AIScrapperProps {
  url: string;
  scale?: number;
}

type ScrapperPhase = 'cruising' | 'turning' | 'braking' | 'stopped';

const _targetWorld = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _halfExtents = new THREE.Vector3(...SCRAPPER_COLLIDER_HALF_EXTENTS);

const shipStartPosition = (): [number, number, number] => {
  const startPlanet = PLANETS.find((p) => p.name === START_PLANET);
  const startPlanetX = startPlanet
    ? Math.cos(startPlanet.initialAngle) * startPlanet.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  const startPlanetZ = startPlanet
    ? -Math.sin(startPlanet.initialAngle) * startPlanet.orbitRadius * SOLAR_SYSTEM_SCALE
    : 0;
  return [startPlanetX + START_DISTANCE_FROM_PLANET, 0, startPlanetZ];
};

export default function AIScrapper({ url, scale = 3 }: AIScrapperProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null!);
  const position = useMemo(() => shipStartPosition(), []);
  const id = useMemo(() => `ai-scrapper`, []);

  const phaseRef = useRef<ScrapperPhase>('cruising');
  const speedRef = useRef(SCRAPPER_CRUISE_SPEED);
  const brakingFiredRef = useRef(false);
  const destroyedRef = useRef(false);
  const damagedRef = useRef(false);

  // Turning state
  const turnStartQuat = useRef(new THREE.Quaternion());
  const turnTargetQuat = useRef(new THREE.Quaternion());
  const turnProgressRef = useRef(0); // 0 → 1

  //Spotlight
  const spotlightRef = useRef<THREE.PointLight>(null!);

  useEffect(() => {
    registerDriveSignature({
      id,
      label: 'AIS Roebuck',
      getPosition: (target) => target.setFromMatrixPosition(groupRef.current.matrixWorld),
    });
    registerCollidable({
      id,
      getWorldPosition: (target) => target.copy(scrapperWorldPos),
      getWorldQuaternion: (target) => target.copy(scrapperWorldQuat),
      shape: { type: 'box', halfExtents: _halfExtents },
      getObject3D: () => groupRef.current,
    });
    const onScrapperHit = () => {
      damagedRef.current = true;
    };
    const onScrapperDestroyed = () => {
      destroyedRef.current = true;
      scrapperForwardFiring.current = false;
      scrapperRetroFiring.current = false;
      setScrapperEngineHiss(false);
      unregisterDriveSignature(id);
      unregisterCollidable(id);
      if (groupRef.current) groupRef.current.visible = false;
    };
    window.addEventListener('ScrapperHit', onScrapperHit);
    window.addEventListener('ScrapperDestroyed', onScrapperDestroyed);

    return () => {
      unregisterDriveSignature(id);
      unregisterCollidable(id);
      scrapperForwardFiring.current = false;
      scrapperRetroFiring.current = false;
      setScrapperEngineHiss(false);
      window.removeEventListener('ScrapperHit', onScrapperHit);
      window.removeEventListener('ScrapperDestroyed', onScrapperDestroyed);
    };
  }, [id]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (destroyedRef.current) return;

    const phase = phaseRef.current;

    // ── Get Neptune world position ────────────────────────────────────────────
    const neptunePlanetPos = solarPlanetPositions['Neptune'];
    if (neptunePlanetPos) {
      _targetWorld.set(
        neptunePlanetPos.x * SOLAR_SYSTEM_SCALE,
        0,
        neptunePlanetPos.z * SOLAR_SYSTEM_SCALE
      );
    }

    // ── Engine audio + forward thruster state ────────────────────────────────
    const isStopped = phase === 'stopped';
    setScrapperEngineHiss(!isStopped, 0.09, 420);
    scrapperForwardFiring.current = phase === 'cruising' || phase === 'turning';

    //Spotlight

    // ── Phase: CRUISING ───────────────────────────────────────────────────────
    if (phase === 'cruising') {
      spotlightRef.current.intensity = damagedRef.current ? 0 : 100000;

      const distToNeptune = _targetWorld.distanceTo(groupRef.current.position);

      if (distToNeptune < SCRAPPER_BRAKE_TRIGGER_DIST) {
        // Begin 180° flip maneuver
        phaseRef.current = 'turning';
        turnProgressRef.current = 0;
        turnStartQuat.current.copy(groupRef.current.quaternion);
        // Target = 180° Y rotation from current orientation
        const yFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        turnTargetQuat.current.copy(groupRef.current.quaternion).multiply(yFlip);

        if (!brakingFiredRef.current) {
          brakingFiredRef.current = true;
          window.dispatchEvent(new CustomEvent('ScrapperBrakingStarted'));
        }
      } else {
        // Move toward Venus
        _forward.subVectors(_targetWorld, groupRef.current.position).normalize();
        groupRef.current.position.addScaledVector(_forward, speedRef.current * delta);

        // Orient model toward Venus (+X is forward for this model)
        if (_forward.lengthSq() > 0.001) {
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(1, 0, 0),
            _forward
          );
          groupRef.current.quaternion.slerp(targetQuat, Math.min(delta * 2, 1));
        }
      }
    }

    // ── Phase: TURNING (180° Y flip) ──────────────────────────────────────────
    if (phase === 'turning') {
      spotlightRef.current.intensity = 0;

      scrapperForwardFiring.current = false;
      // Keep drifting at cruise speed while turning
      _forward.subVectors(_targetWorld, groupRef.current.position).normalize();
      groupRef.current.position.addScaledVector(_forward, speedRef.current * delta);

      // Advance rotation
      const turnRate = SCRAPPER_TURN_SPEED * delta; // radians this frame
      turnProgressRef.current = Math.min(
        1,
        turnProgressRef.current + turnRate / Math.PI // π rad = full 180°
      );
      groupRef.current.quaternion.slerpQuaternions(
        turnStartQuat.current,
        turnTargetQuat.current,
        turnProgressRef.current
      );

      if (turnProgressRef.current >= 1) {
        phaseRef.current = 'braking';
        scrapperRetroFiring.current = true;
      }
    }

    // ── Phase: BRAKING (retro burn) ───────────────────────────────────────────
    if (phase === 'braking') {
      spotlightRef.current.intensity = 100000;
      scrapperForwardFiring.current = true;
      speedRef.current = Math.max(0, speedRef.current - SCRAPPER_BRAKE_DECEL * delta);

      if (speedRef.current > 0) {
        _forward.subVectors(_targetWorld, groupRef.current.position).normalize();
        groupRef.current.position.addScaledVector(_forward, speedRef.current * delta);
      } else {
        phaseRef.current = 'stopped';
        scrapperRetroFiring.current = false;
      }
    }

    // ── Phase: STOPPED ────────────────────────────────────────────────────────
    if (phase === 'stopped') {
      spotlightRef.current.intensity = damagedRef.current ? 0 : 50000;
    }

    // ── Publish world transform every frame ───────────────────────────────────
    scrapperWorldPos.copy(groupRef.current.position);
    groupRef.current.getWorldQuaternion(scrapperWorldQuat);
  });

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        scale={scale}
        rotation-y={SCRAPPER_INITIAL_ROTATION_Y}
        onClick={(e) => {
          e.stopPropagation();
          selectTarget('AIS Roebuck', new THREE.Vector3(), scrapperWorldPos);
          flashTarget();
          window.dispatchEvent(new CustomEvent('ScrapperTargeted'));
        }}
      >
        <primitive object={scene} />
        <group position={[-34, -1, 0]}>
          <group position={[-10, 0, 0]}>
            <pointLight ref={spotlightRef} color="#6699ff" />
          </group>
          <group position={[0, 0, -8]}>
            <ScrapperThrusterFX />
          </group>
          <group position={[0, 0, 8]}>
            <ScrapperThrusterFX />
          </group>
        </group>
      </group>
    </>
  );
}
