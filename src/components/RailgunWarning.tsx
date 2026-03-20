import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import {
  MAIN_ENGINE_LOCAL_POS,
  railgunImpactDir,
  railgunImpactAt,
  railgunTargetEngine,
} from '../context/ShipState';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';
import {
  RAILGUN_STRIKE_DISTANCE,
  RAILGUN_STRIKE_COOLDOWN,
  RAILGUN_SHOT_DURATION,
  RAILGUN_SHOT_OVERSHOOT,
  RAILGUN_SHOT_HEIGHT_VARIANCE,
} from '../config/neptuneConfig';

const DEBUG_RAILGUN = true;
const DEBUG_HIT_SCALE = 10;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

interface RailgunWarningProps {
  shipPositionRef: { current: THREE.Vector3 };
  shipGroupRef?: { current: THREE.Group | null };
}

export default function RailgunWarning({ shipPositionRef, shipGroupRef }: RailgunWarningProps) {
  const beamRef = useRef<THREE.Group>(null!);
  const debugRef = useRef<THREE.Group>(null!);
  const lastStrikeRef = useRef(-RAILGUN_STRIKE_COOLDOWN);
  const shotStartRef = useRef(0);
  const shotActiveRef = useRef(false);
  const shotTargetRef = useRef(new THREE.Vector3());
  const shotOriginRef = useRef(new THREE.Vector3());
  const shotHeightRef = useRef(0);

  const geometry = useMemo(() => new THREE.CylinderGeometry(0.03, 0.03, 1, 12, 1, true), []);
  const debugHitGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff2a00'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const coreGeometry = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1, 10, 1, true), []);
  const coreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#fff6cc'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const debugMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00ffcc'),
        wireframe: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    []
  );

  const dir = useRef(new THREE.Vector3());
  const mid = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());
  const engineTarget = useRef(new THREE.Vector3());

  const getEngineTarget = () => {
    const group = shipGroupRef?.current;
    if (!group) return null;
    const targetKey = Math.random() < 0.5 ? 'reverseA' : 'reverseB';
    const local = MAIN_ENGINE_LOCAL_POS[targetKey];
    railgunTargetEngine.current = targetKey;
    engineTarget.current.copy(local);
    group.localToWorld(engineTarget.current);
    return engineTarget.current;
  };

  useFrame(({ clock }) => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos || !beamRef.current) return;

    shotOriginRef.current.set(
      planetPos.x * SOLAR_SYSTEM_SCALE,
      shotHeightRef.current,
      planetPos.z * SOLAR_SYSTEM_SCALE
    );

    const shipPos = shipPositionRef.current;
    const distance = shotOriginRef.current.distanceTo(shipPos);
    const now = clock.getElapsedTime();

    if (!shotActiveRef.current) {
      if (distance <= RAILGUN_STRIKE_DISTANCE && now - lastStrikeRef.current >= RAILGUN_STRIKE_COOLDOWN) {
        const target = getEngineTarget();
        if (!target) return;
        lastStrikeRef.current = now;
        shotActiveRef.current = true;
        shotStartRef.current = now;
        shotHeightRef.current = (Math.random() * 2 - 1) * RAILGUN_SHOT_HEIGHT_VARIANCE;
        shotTargetRef.current.copy(target);
        railgunImpactDir.subVectors(target, shotOriginRef.current).normalize();
        railgunImpactAt.current = performance.now();
        window.dispatchEvent(
          new CustomEvent('RailgunHit', {
            detail: { targetEngine: railgunTargetEngine.current },
          })
        );
      }
    }

    if (!shotActiveRef.current) {
      beamRef.current.visible = false;
      if (debugRef.current) debugRef.current.visible = false;
      return;
    }

    const t = (now - shotStartRef.current) / RAILGUN_SHOT_DURATION;
    if (t >= 1) {
      shotActiveRef.current = false;
      beamRef.current.visible = false;
      if (debugRef.current) debugRef.current.visible = false;
      return;
    }

    beamRef.current.visible = true;

    dir.current.subVectors(shotTargetRef.current, shotOriginRef.current);
    const len = dir.current.length();
    if (len < 1) {
      beamRef.current.visible = false;
      if (debugRef.current) debugRef.current.visible = false;
      return;
    }

    dir.current.normalize();
    const extendedLen = len + RAILGUN_SHOT_OVERSHOOT;
    mid.current.copy(shotOriginRef.current).addScaledVector(dir.current, extendedLen * 0.5);
    quat.current.setFromUnitVectors(Y_AXIS, dir.current);

    beamRef.current.position.copy(mid.current);
    beamRef.current.quaternion.copy(quat.current);
    beamRef.current.scale.set(1, extendedLen, 1);

    if (DEBUG_RAILGUN && debugRef.current) {
      debugRef.current.visible = true;
      debugRef.current.position.copy(shotTargetRef.current);
      debugRef.current.scale.setScalar(0.03 * DEBUG_HIT_SCALE);
    }

    const fade = Math.max(0, 1 - t);
    material.opacity = fade * 0.45;
    coreMaterial.opacity = fade * 0.7;
  });

  return (
    <>
      <group ref={beamRef} frustumCulled={false}>
        <mesh geometry={geometry} material={material} />
        <mesh geometry={coreGeometry} material={coreMaterial} />
      </group>
      <group ref={debugRef} frustumCulled={false}>
        <mesh geometry={debugHitGeometry} material={debugMaterial} />
      </group>
    </>
  );
}
