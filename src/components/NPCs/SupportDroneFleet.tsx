import { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { PLANETS, SOLAR_SYSTEM_SCALE } from '../Planets/SolarSystem';
import { SPACE_STATION_DEF, FUEL_STATION_DEF, ASTEROID_DOCK_DEF } from '../../config/worldConfig';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';

// ── Config ────────────────────────────────────────────────────────────────────
const DRONE_COUNT = 50;
const DRONE_THRUST = 3.0; // units/s² acceleration
const MAX_SPEED = 250; // hard speed cap (world units/s)
const BRAKE_DIST = 6000; // begin braking within this radius of target
const ARRIVE_DIST = 500; // consider "arrived" within this radius
const ARRIVE_SPEED = 20; // m/s — stop braking once this slow
const DWELL_TIME = 8; // seconds loitering at target before re-targeting
const SPAWN_RADIUS = 86_000; // ring radius around Neptune at spawn
const DRONE_SCALE = 1;
const YAW_P = 3.0; // yaw PD gain — proportional
const YAW_D = 4.5; // yaw PD gain — derivative (damping)

// ── Types ─────────────────────────────────────────────────────────────────────
type DroneState = 'cruising' | 'braking' | 'arrived';
type TargetId = 'player' | 'station' | 'fuel' | 'asteroid-dock' | 'neptune';

const ALL_TARGETS: TargetId[] = ['player', 'station', 'fuel', 'asteroid-dock', 'neptune'];

interface DronePhy {
  vel: THREE.Vector3;
  angVel: number;
  state: DroneState;
  targetId: TargetId;
  dwellTimer: number;
}

// ── Neptune's starting world position ─────────────────────────────────────────
// solarPlanetPositions stores local-space coords; world = local * SOLAR_SYSTEM_SCALE.
// We replicate the same formula useShipInit uses for the player spawn point.
const _neptunePlanet = PLANETS.find((p) => p.name === 'Neptune')!;
const NEPTUNE_WORLD_X =
  Math.cos(_neptunePlanet.initialAngle) * _neptunePlanet.orbitRadius * SOLAR_SYSTEM_SCALE;
const NEPTUNE_WORLD_Z =
  -Math.sin(_neptunePlanet.initialAngle) * _neptunePlanet.orbitRadius * SOLAR_SYSTEM_SCALE;

// ── Static reference positions (world space, matching worldConfig scale) ──────
const STATION_POS = new THREE.Vector3(...SPACE_STATION_DEF.position);
const FUEL_POS = new THREE.Vector3(...FUEL_STATION_DEF.position);
const DOCK_POS = new THREE.Vector3(...ASTEROID_DOCK_DEF.position);
const NEPTUNE_POS = new THREE.Vector3(NEPTUNE_WORLD_X, 0, NEPTUNE_WORLD_Z);

// ── Module-level reusable vectors (safe: JS is single-threaded) ───────────────
const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _toTgt = new THREE.Vector3();
const _thrDir = new THREE.Vector3();
const _localFwd = new THREE.Vector3();

// ── Helpers ───────────────────────────────────────────────────────────────────
function pickNewTarget(current: TargetId): TargetId {
  const opts = ALL_TARGETS.filter((t) => t !== current);
  return opts[Math.floor(Math.random() * opts.length)];
}

function resolveTargetPos(id: TargetId, out: THREE.Vector3): void {
  switch (id) {
    case 'player':
      out.copy(minimapShipPosition);
      break;
    case 'station':
      out.copy(STATION_POS);
      break;
    case 'fuel':
      out.copy(FUEL_POS);
      break;
    case 'asteroid-dock':
      out.copy(DOCK_POS);
      break;
    case 'neptune':
      out.copy(NEPTUNE_POS);
      break;
  }
}

/**
 * PD yaw controller + main-engine thrust toward thrDir.
 * Returns true if thrust was applied this frame (used to toggle engine glow).
 */
function steerAndThrust(
  phy: DronePhy,
  thrDir: THREE.Vector3,
  dt: number,
  group: THREE.Group
): boolean {
  const tx = thrDir.x;
  const tz = thrDir.z;
  if (Math.abs(tx) + Math.abs(tz) > 0.01) {
    const targetYaw = Math.atan2(tx, tz);
    let yawErr = targetYaw - group.rotation.y;
    while (yawErr > Math.PI) yawErr -= 2 * Math.PI;
    while (yawErr < -Math.PI) yawErr += 2 * Math.PI;
    phy.angVel += (yawErr * YAW_P - phy.angVel * YAW_D) * dt;
  }

  // Fire main engine when nose (-Z local) is aligned with thrust direction
  _localFwd.set(0, 0, -1).applyQuaternion(group.quaternion);
  if (_localFwd.dot(thrDir) < -0.85) {
    phy.vel.addScaledVector(_localFwd, -DRONE_THRUST * dt);
    return true;
  }
  return false;
}

// ── Evenly-spaced spawn positions on a ring around Neptune's world position ────
function buildSpawnPositions(): [number, number, number][] {
  return Array.from({ length: DRONE_COUNT }, (_, i) => {
    const angle = (i / DRONE_COUNT) * Math.PI * 2;
    return [
      NEPTUNE_WORLD_X + Math.cos(angle) * SPAWN_RADIUS,
      0,
      NEPTUNE_WORLD_Z + Math.sin(angle) * SPAWN_RADIUS,
    ];
  });
}

const SPAWN_POSITIONS = buildSpawnPositions();

// ── Component ─────────────────────────────────────────────────────────────────
export default function SupportDroneFleet() {
  const gltf = useGLTF('/drone/untitled.gltf') as unknown as { scene: THREE.Group };

  // SkeletonUtils.clone handles SkinnedMesh skeleton rebinding correctly,
  // unlike scene.clone(true) which leaves broken skeleton references.
  const clonedScenes = useMemo(
    () => Array.from({ length: DRONE_COUNT }, () => SkeletonUtils.clone(gltf.scene)),
    [gltf.scene]
  );

  const groupRefs = useRef<(THREE.Group | null)[]>(Array(DRONE_COUNT).fill(null));
  const glowRefs = useRef<(THREE.MeshBasicMaterial | null)[]>(Array(DRONE_COUNT).fill(null));

  // Per-drone physics state — stored in a ref array to avoid React re-renders.
  const physics = useRef<DronePhy[]>(
    Array.from({ length: DRONE_COUNT }, (_, i) => ({
      vel: new THREE.Vector3(
        Math.sin((i / DRONE_COUNT) * Math.PI * 2) * 12,
        0,
        Math.cos((i / DRONE_COUNT) * Math.PI * 2) * 12
      ),
      angVel: 0,
      state: 'cruising' as DroneState,
      targetId: ALL_TARGETS[i % ALL_TARGETS.length],
      dwellTimer: 0,
    }))
  );

  // Register all 50 drones on the drive signature scanner
  useEffect(() => {
    for (let i = 0; i < DRONE_COUNT; i++) {
      const idx = i;
      registerDriveSignature({
        id: `support-drone-${i}`,
        label: `SUPPORT DRONE-${String(i + 1).padStart(2, '0')}`,
        getPosition: (target) => {
          const group = groupRefs.current[idx];
          if (group) group.getWorldPosition(target);
          return target;
        },
      });
    }
    return () => {
      for (let i = 0; i < DRONE_COUNT; i++) {
        unregisterDriveSignature(`support-drone-${i}`);
      }
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);

    for (let i = 0; i < DRONE_COUNT; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;
      const phy = physics.current[i];
      let thrusting = false;

      group.getWorldPosition(_pos);
      resolveTargetPos(phy.targetId, _tgt);
      _toTgt.subVectors(_tgt, _pos);
      const dist = _toTgt.length();
      const speed = phy.vel.length();

      switch (phy.state) {
        case 'cruising': {
          if (dist < BRAKE_DIST) {
            phy.state = 'braking';
          } else {
            _thrDir.copy(_toTgt).normalize();
            thrusting = steerAndThrust(phy, _thrDir, dt, group);
          }
          break;
        }

        case 'braking': {
          if (dist < ARRIVE_DIST && speed < ARRIVE_SPEED) {
            phy.state = 'arrived';
            phy.dwellTimer = 0;
            phy.vel.multiplyScalar(0.05);
          } else if (dist > BRAKE_DIST * 1.4) {
            phy.state = 'cruising';
          } else if (speed > 1.0) {
            _thrDir.copy(phy.vel).normalize().negate();
            thrusting = steerAndThrust(phy, _thrDir, dt, group);
          }
          break;
        }

        case 'arrived': {
          phy.vel.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
          phy.dwellTimer += dt;
          if (phy.dwellTimer > DWELL_TIME) {
            phy.targetId = pickNewTarget(phy.targetId);
            phy.state = 'cruising';
          }
          break;
        }
      }

      if (speed > MAX_SPEED) phy.vel.multiplyScalar(MAX_SPEED / speed);

      group.rotation.y += phy.angVel * dt;
      group.position.addScaledVector(phy.vel, dt);
      group.position.y = 0;
      phy.vel.y = 0;

      const mat = glowRefs.current[i];
      if (mat) mat.opacity = thrusting ? 0.9 : 0.12;
    }
  });

  return (
    <>
      {SPAWN_POSITIONS.map((pos, i) => (
        <group
          key={i}
          ref={(el: THREE.Group | null) => {
            groupRefs.current[i] = el;
          }}
          position={pos}
          frustumCulled={false}
          scale={1}
        >
          <primitive object={clonedScenes[i]} scale={DRONE_SCALE} />
        </group>
      ))}
    </>
  );
}

useGLTF.preload('/supportDrone.glb');
