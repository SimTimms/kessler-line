import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import {
  MAIN_ENGINE_LOCAL_POS,
  railgunImpactDir,
  railgunImpactAt,
  railgunTargetEngine,
} from '../../context/ShipState';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { DEBUG_RAILGUN, DEBUG_HIT_SCALE } from '../../config/debugConfig';
import {
  RAILGUN_BEAM_OUTER_RADIUS,
  RAILGUN_BEAM_INNER_RADIUS,
  RAILGUN_BEAM_COLOR,
  RAILGUN_BEAM_CORE_COLOR,
  RAILGUN_BEAM_MAX_OPACITY,
  RAILGUN_CORE_MAX_OPACITY,
  RAILGUN_CHARGE_GLOW_RADIUS,
  RAILGUN_CHARGE_CORE_RADIUS,
  RAILGUN_CHARGE_INTENSITY,
  RAILGUN_CHARGE_GLOW_MAX_OPACITY,
  RAILGUN_CHARGE_CORE_MAX_OPACITY,
} from '../../config/combatConfig';
import {
  RAILGUN_STRIKE_DISTANCE,
  RAILGUN_STRIKE_COOLDOWN,
  RAILGUN_CHARGE_DURATION,
  RAILGUN_SHOT_DURATION,
  RAILGUN_SHOT_OVERSHOOT,
} from '../../config/neptuneConfig';
import { shipPosRef } from '../../context/ShipPos';
import { PLANETS } from '../Planets/SolarSystem';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Neptune surface radius in world units — origin snaps to surface facing the player
const NEPTUNE_WORLD_RADIUS = PLANETS[7].radius * SOLAR_SYSTEM_SCALE;

// Railgun charge spotlight
const RAILGUN_SPOTLIGHT_MAX_INTENSITY = 100000000;
const RAILGUN_SPOTLIGHT_ANGLE = 0.22;
const RAILGUN_SPOTLIGHT_PENUMBRA = 0.5;
const RAILGUN_SPOTLIGHT_DISTANCE = NEPTUNE_WORLD_RADIUS * 0.6;

interface RailgunWarningProps {
  shipGroupRef?: { current: THREE.Group | null };
}

export default function RailgunWarning({ shipGroupRef }: RailgunWarningProps) {
  const beamRef = useRef<THREE.Group>(null!);
  const chargeRef = useRef<THREE.Group>(null!);
  const debugRef = useRef<THREE.Group>(null!);
  const lastStrikeRef = useRef(-RAILGUN_STRIKE_COOLDOWN);
  const shotStartRef = useRef(0);
  const shotActiveRef = useRef(false);
  const chargeActiveRef = useRef(false);
  const chargeStartRef = useRef(0);
  const shotTargetRef = useRef(new THREE.Vector3());
  const shotOriginRef = useRef(new THREE.Vector3());
  const lockedShotOriginRef = useRef(new THREE.Vector3());
  const neptuneCenterRef = useRef(new THREE.Vector3());
  const spotlightRef = useRef<THREE.SpotLight>(null!);
  const spotlightTargetRef = useRef(new THREE.Object3D());

  const geometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        RAILGUN_BEAM_OUTER_RADIUS,
        RAILGUN_BEAM_OUTER_RADIUS,
        1,
        12,
        1,
        true
      ),
    []
  );
  const debugHitGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(RAILGUN_BEAM_COLOR),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const coreGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        RAILGUN_BEAM_INNER_RADIUS,
        RAILGUN_BEAM_INNER_RADIUS,
        1,
        10,
        1,
        true
      ),
    []
  );
  const coreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(RAILGUN_BEAM_CORE_COLOR),
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

  const chargeGlowGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const chargeGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          RAILGUN_CHARGE_INTENSITY,
          RAILGUN_CHARGE_INTENSITY,
          RAILGUN_CHARGE_INTENSITY
        ),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const chargeCoreGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const chargeCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          RAILGUN_CHARGE_INTENSITY * 2,
          RAILGUN_CHARGE_INTENSITY * 2,
          RAILGUN_CHARGE_INTENSITY * 2
        ),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const dir = useRef(new THREE.Vector3());
  const mid = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());
  const engineTarget = useRef(new THREE.Vector3());
  const dirToPlayer = useRef(new THREE.Vector3());

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

    // Neptune's world-space centre
    neptuneCenterRef.current.set(
      planetPos.x * SOLAR_SYSTEM_SCALE,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE
    );

    const shipPos = shipPosRef.current;
    const distance = neptuneCenterRef.current.distanceTo(shipPos);
    const now = clock.getElapsedTime();

    // Surface point on Neptune facing the player
    dirToPlayer.current.subVectors(shipPos, neptuneCenterRef.current).normalize();
    shotOriginRef.current
      .copy(neptuneCenterRef.current)
      .addScaledVector(dirToPlayer.current, NEPTUNE_WORLD_RADIUS);

    // Begin charge phase when in range, not already active, and cooldown passed
    if (!shotActiveRef.current && !chargeActiveRef.current) {
      if (
        distance <= RAILGUN_STRIKE_DISTANCE &&
        now - lastStrikeRef.current >= RAILGUN_STRIKE_COOLDOWN
      ) {
        chargeActiveRef.current = true;
        chargeStartRef.current = now;
        // Pick a random point on the hemisphere of Neptune facing the player
        const toPlayer = new THREE.Vector3()
          .subVectors(shipPos, neptuneCenterRef.current)
          .normalize();
        const randomDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
        if (randomDir.dot(toPlayer) < 0) randomDir.negate();
        lockedShotOriginRef.current
          .copy(neptuneCenterRef.current)
          .addScaledVector(randomDir, NEPTUNE_WORLD_RADIUS);
      }
    }

    // Animate charge glow sphere
    if (chargeRef.current) {
      if (chargeActiveRef.current) {
        const chargeT = Math.min(1, (now - chargeStartRef.current) / RAILGUN_CHARGE_DURATION);
        chargeRef.current.visible = true;
        chargeRef.current.position.copy(lockedShotOriginRef.current);
        chargeGlowMat.opacity = chargeT * RAILGUN_CHARGE_GLOW_MAX_OPACITY;
        chargeCoreMat.opacity = chargeT * RAILGUN_CHARGE_CORE_MAX_OPACITY;

        // Drive spotlight — position above surface, aimed at locked origin
        if (spotlightRef.current) {
          const surfaceDir = new THREE.Vector3()
            .subVectors(lockedShotOriginRef.current, neptuneCenterRef.current)
            .normalize();
          spotlightRef.current.position
            .copy(neptuneCenterRef.current)
            .addScaledVector(surfaceDir, NEPTUNE_WORLD_RADIUS * 1.4);
          spotlightTargetRef.current.position.copy(lockedShotOriginRef.current);
          spotlightTargetRef.current.updateMatrixWorld();
          spotlightRef.current.intensity = chargeT * RAILGUN_SPOTLIGHT_MAX_INTENSITY;
        }

        // Fully charged — fire the shot
        if (chargeT >= 1) {
          chargeActiveRef.current = false;
          chargeRef.current.visible = false;
          chargeGlowMat.opacity = 0;
          chargeCoreMat.opacity = 0;
          if (spotlightRef.current) spotlightRef.current.intensity = 0;

          const target = getEngineTarget();
          if (target) {
            lastStrikeRef.current = now;
            shotActiveRef.current = true;
            shotStartRef.current = now;
            shotTargetRef.current.copy(target);
            railgunImpactDir.subVectors(target, lockedShotOriginRef.current).normalize();
            railgunImpactAt.current = performance.now();
            window.dispatchEvent(
              new CustomEvent('RailgunHit', {
                detail: { targetEngine: railgunTargetEngine.current },
              })
            );
          }
        }
      } else {
        chargeRef.current.visible = false;
        if (spotlightRef.current) spotlightRef.current.intensity = 0;
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

    dir.current.subVectors(shotTargetRef.current, lockedShotOriginRef.current);
    const len = dir.current.length();
    if (len < 1) {
      beamRef.current.visible = false;
      if (debugRef.current) debugRef.current.visible = false;
      return;
    }

    dir.current.normalize();
    const extendedLen = len + RAILGUN_SHOT_OVERSHOOT;
    mid.current.copy(lockedShotOriginRef.current).addScaledVector(dir.current, extendedLen * 0.5);
    quat.current.setFromUnitVectors(Y_AXIS, dir.current);

    beamRef.current.position.copy(mid.current);
    beamRef.current.quaternion.copy(quat.current);
    beamRef.current.scale.set(1, extendedLen, 1);

    if (DEBUG_RAILGUN && debugRef.current) {
      debugRef.current.visible = true;
      debugRef.current.position.copy(shotTargetRef.current);
      debugRef.current.scale.setScalar(RAILGUN_BEAM_OUTER_RADIUS * DEBUG_HIT_SCALE);
    }

    const fade = Math.max(0, 1 - t);
    material.opacity = fade * RAILGUN_BEAM_MAX_OPACITY;
    coreMaterial.opacity = fade * RAILGUN_CORE_MAX_OPACITY;
  });

  return (
    <>
      <spotLight
        ref={spotlightRef}
        intensity={0}
        angle={RAILGUN_SPOTLIGHT_ANGLE}
        penumbra={RAILGUN_SPOTLIGHT_PENUMBRA}
        distance={RAILGUN_SPOTLIGHT_DISTANCE}
        color="#6699ff"
        castShadow={false}
        target={spotlightTargetRef.current}
      />
      <primitive object={spotlightTargetRef.current} />
      <group ref={chargeRef} frustumCulled={false}>
        <mesh
          geometry={chargeGlowGeo}
          material={chargeGlowMat}
          scale={RAILGUN_CHARGE_GLOW_RADIUS}
        />
        <mesh
          geometry={chargeCoreGeo}
          material={chargeCoreMat}
          scale={RAILGUN_CHARGE_CORE_RADIUS}
        />
      </group>
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
