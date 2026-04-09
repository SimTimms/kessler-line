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
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import {
  scrapperWorldPos,
  scrapperWorldQuat,
  scrapperRetroFiring,
} from '../../context/CinematicState';
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

const _venusWorld = new THREE.Vector3();
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

  // Turning state
  const turnStartQuat = useRef(new THREE.Quaternion());
  const turnTargetQuat = useRef(new THREE.Quaternion());
  const turnProgressRef = useRef(0); // 0 → 1

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
    return () => {
      unregisterDriveSignature(id);
      unregisterCollidable(id);
    };
  }, [id]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const phase = phaseRef.current;

    // ── Get Venus world position ──────────────────────────────────────────────
    const venusPlanetPos = solarPlanetPositions['Venus'];
    if (venusPlanetPos) {
      _venusWorld.set(
        venusPlanetPos.x * SOLAR_SYSTEM_SCALE,
        0,
        venusPlanetPos.z * SOLAR_SYSTEM_SCALE
      );
    }

    // ── Phase: CRUISING ───────────────────────────────────────────────────────
    if (phase === 'cruising') {
      const distToVenus = _venusWorld.distanceTo(groupRef.current.position);

      if (distToVenus < SCRAPPER_BRAKE_TRIGGER_DIST) {
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
        _forward.subVectors(_venusWorld, groupRef.current.position).normalize();
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
      // Keep drifting at cruise speed while turning
      _forward.subVectors(_venusWorld, groupRef.current.position).normalize();
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
      speedRef.current = Math.max(0, speedRef.current - SCRAPPER_BRAKE_DECEL * delta);

      if (speedRef.current > 0) {
        _forward.subVectors(_venusWorld, groupRef.current.position).normalize();
        groupRef.current.position.addScaledVector(_forward, speedRef.current * delta);
      } else {
        phaseRef.current = 'stopped';
        scrapperRetroFiring.current = false;
      }
    }

    // ── Publish world transform every frame ───────────────────────────────────
    scrapperWorldPos.copy(groupRef.current.position);
    groupRef.current.getWorldQuaternion(scrapperWorldQuat);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      rotation-y={SCRAPPER_INITIAL_ROTATION_Y}
    >
      <primitive object={scene} />
      <ScrapperThrusterFX />
    </group>
  );
}
