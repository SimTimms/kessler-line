import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import {
  shipControlDisabledUntil,
  cinematicThrustForward,
  cinematicThrustReverse,
  railgunImpactDir,
  railgunImpactAt,
} from '../context/ShipState';
import { cinematicAutopilotActive } from '../context/CinematicState';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';

const WARNING_DISTANCE = 42000;
const STRIKE_DISTANCE = 42000;
const WARNING_COOLDOWN = 3.0;
const STRIKE_COOLDOWN = 0.5;
const SHOT_DURATION = 0.28;
const SHOT_OVERSHOOT = 8000;
const PASS_OFFSET = 0;
const SHOT_HEIGHT_VARIANCE = 12000;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

interface RailgunWarningProps {
  shipPositionRef: { current: THREE.Vector3 };
}

export default function RailgunWarning({ shipPositionRef }: RailgunWarningProps) {
  const beamRef = useRef<THREE.Group>(null!);
  const lastWarningRef = useRef(0);
  const lastStrikeRef = useRef(0);
  const shotStartRef = useRef(0);
  const shotActiveRef = useRef(false);
  const shotTargetRef = useRef(new THREE.Vector3());
  const shotOriginRef = useRef(new THREE.Vector3());
  const shotHeightRef = useRef(0);

  const geometry = useMemo(() => new THREE.CylinderGeometry(0.03, 0.03, 1, 12, 1, true), []);
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

  const dir = useRef(new THREE.Vector3());
  const perp = useRef(new THREE.Vector3());
  const mid = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());

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
      if (distance <= STRIKE_DISTANCE && now - lastStrikeRef.current >= STRIKE_COOLDOWN) {
        lastStrikeRef.current = now;
        shotActiveRef.current = true;
        shotStartRef.current = now;
        shotHeightRef.current = (Math.random() * 2 - 1) * SHOT_HEIGHT_VARIANCE;
        shotTargetRef.current.copy(shipPos);
        railgunImpactDir.subVectors(shipPos, shotOriginRef.current).normalize();
        railgunImpactAt.current = performance.now();
        const nowMs = performance.now();
        shipControlDisabledUntil.current = nowMs + 2500;
        cinematicAutopilotActive.current = false;
        cinematicThrustForward.current = false;
        cinematicThrustReverse.current = false;
        window.dispatchEvent(new CustomEvent('RailgunHit'));
      } else if (distance <= WARNING_DISTANCE && now - lastWarningRef.current >= WARNING_COOLDOWN) {
        lastWarningRef.current = now;
        shotActiveRef.current = true;
        shotStartRef.current = now;
        dir.current.subVectors(shipPos, shotOriginRef.current).normalize();
        perp.current.set(-dir.current.z, 0, dir.current.x).normalize();
        shotHeightRef.current = (Math.random() * 2 - 1) * SHOT_HEIGHT_VARIANCE;
        shotTargetRef.current.copy(shipPos).addScaledVector(perp.current, PASS_OFFSET);
      }
    }

    if (!shotActiveRef.current) {
      beamRef.current.visible = false;
      return;
    }

    const t = (now - shotStartRef.current) / SHOT_DURATION;
    if (t >= 1) {
      shotActiveRef.current = false;
      beamRef.current.visible = false;
      return;
    }

    beamRef.current.visible = true;

    dir.current.subVectors(shotTargetRef.current, shotOriginRef.current);
    const len = dir.current.length();
    if (len < 1) {
      beamRef.current.visible = false;
      return;
    }

    dir.current.normalize();
    const extendedLen = len + SHOT_OVERSHOOT;
    mid.current.copy(shotOriginRef.current).addScaledVector(dir.current, extendedLen * 0.5);
    quat.current.setFromUnitVectors(Y_AXIS, dir.current);

    beamRef.current.position.copy(mid.current);
    beamRef.current.quaternion.copy(quat.current);
    beamRef.current.scale.set(1, extendedLen, 1);

    const fade = Math.max(0, 1 - t);
    material.opacity = fade * 0.45;
    coreMaterial.opacity = fade * 0.7;
  });

  return (
    <group ref={beamRef} frustumCulled={false}>
      <mesh geometry={geometry} material={material} />
      <mesh geometry={coreGeometry} material={coreMaterial} />
    </group>
  );
}
