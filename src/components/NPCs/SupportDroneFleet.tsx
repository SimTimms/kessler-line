import { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { SPACE_STATION_DEF, FUEL_STATION_DEF, ASTEROID_DOCK_DEF } from '../../config/worldConfig';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';

// ── Config ────────────────────────────────────────────────────────────────────
const DRONE_COUNT   = 10;
const DRONE_THRUST  = 3.0;    // units/s² acceleration
const MAX_SPEED     = 250;    // hard speed cap (world units/s)
const BRAKE_DIST    = 6000;   // begin braking within this radius of target
const ARRIVE_DIST   = 500;    // consider "arrived" within this radius
const ARRIVE_SPEED  = 20;     // m/s — stop braking once this slow
const DWELL_TIME    = 8;      // seconds loitering at target before re-targeting
const SPAWN_RADIUS  = 1000;   // distance from player for initial placement
const DRONE_SCALE   = 1;
const YAW_P         = 3.0;    // yaw PD gain — proportional
const YAW_D         = 4.5;    // yaw PD gain — derivative (damping)

// ── Types ─────────────────────────────────────────────────────────────────────
type DroneState = 'cruising' | 'braking' | 'arrived';
type TargetId   = 'player' | 'station' | 'fuel' | 'asteroid-dock' | 'neptune';

const ALL_TARGETS: TargetId[] = ['player', 'station', 'fuel', 'asteroid-dock', 'neptune'];

interface DronePhy {
  vel:       THREE.Vector3;
  angVel:    number;
  state:     DroneState;
  targetId:  TargetId;
  dwellTimer: number;
}

// ── Static reference positions (world space, matching worldConfig scale) ──────
const STATION_POS = new THREE.Vector3(...SPACE_STATION_DEF.position);
const FUEL_POS    = new THREE.Vector3(...FUEL_STATION_DEF.position);
const DOCK_POS    = new THREE.Vector3(...ASTEROID_DOCK_DEF.position);
const NEPTUNE_POS = new THREE.Vector3(0, 0, 0); // Neptune is the scene origin

// ── Module-level reusable vectors (safe: JS is single-threaded) ───────────────
const _pos      = new THREE.Vector3();
const _tgt      = new THREE.Vector3();
const _toTgt    = new THREE.Vector3();
const _thrDir   = new THREE.Vector3();
const _localFwd = new THREE.Vector3();

// ── Helpers ───────────────────────────────────────────────────────────────────
function pickNewTarget(current: TargetId): TargetId {
  const opts = ALL_TARGETS.filter((t) => t !== current);
  return opts[Math.floor(Math.random() * opts.length)];
}

function resolveTargetPos(id: TargetId, out: THREE.Vector3): void {
  switch (id) {
    case 'player':        out.copy(minimapShipPosition); break;
    case 'station':       out.copy(STATION_POS);         break;
    case 'fuel':          out.copy(FUEL_POS);            break;
    case 'asteroid-dock': out.copy(DOCK_POS);            break;
    case 'neptune':       out.copy(NEPTUNE_POS);         break;
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
  group: THREE.Group,
): boolean {
  const tx = thrDir.x;
  const tz = thrDir.z;
  if (Math.abs(tx) + Math.abs(tz) > 0.01) {
    const targetYaw = Math.atan2(tx, tz);
    let yawErr = targetYaw - group.rotation.y;
    while (yawErr >  Math.PI) yawErr -= 2 * Math.PI;
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function SupportDroneFleet() {
  const gltf = useGLTF('/supportDrone.glb') as unknown as { scene: THREE.Group };

  // Clone the GLB scene once per drone so each has its own independent Object3D tree.
  const clonedScenes = useMemo(
    () => Array.from({ length: DRONE_COUNT }, () => gltf.scene.clone(true)),
    [gltf.scene],
  );

  // Evenly-spaced ring around Neptune with varying radii for visual spread.
  const spawnPositions = useMemo<[number, number, number][]>(
    () =>
      Array.from({ length: DRONE_COUNT }, (_, i) => {
        const angle = (i / DRONE_COUNT) * Math.PI * 2;
        const r = SPAWN_RADIUS * (0.5 + 0.5 * (i / Math.max(DRONE_COUNT - 1, 1)));
        return [Math.cos(angle) * r, 0, Math.sin(angle) * r];
      }),
    [],
  );

  const groupRefs = useRef<(THREE.Group | null)[]>(Array(DRONE_COUNT).fill(null));
  const glowRefs  = useRef<(THREE.MeshBasicMaterial | null)[]>(Array(DRONE_COUNT).fill(null));
  const initialized = useRef(false);

  // Per-drone physics state — stored in a ref array to avoid React re-renders.
  const physics = useRef<DronePhy[]>(
    Array.from({ length: DRONE_COUNT }, (_, i) => ({
      vel: new THREE.Vector3(
        Math.sin((i / DRONE_COUNT) * Math.PI * 2) * 12,
        0,
        Math.cos((i / DRONE_COUNT) * Math.PI * 2) * 12,
      ),
      angVel:     0,
      state:      'cruising' as DroneState,
      targetId:   ALL_TARGETS[i % ALL_TARGETS.length],
      dwellTimer: 0,
    })),
  );

  useEffect(() => {
    for (let i = 0; i < DRONE_COUNT; i++) {
      const sigId = `support-drone-${i}`;
      const idx = i; // capture for closure
      registerDriveSignature({
        id: sigId,
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
    const dt = Math.min(delta, 0.033); // clamp frame spike same as player physics

    // On the first frame that the player position is known, shift all drone groups
    // from their ring-relative offsets to world positions centred on the player.
    if (!initialized.current && minimapShipPosition.lengthSq() > 0) {
      initialized.current = true;
      for (let i = 0; i < DRONE_COUNT; i++) {
        const group = groupRefs.current[i];
        if (!group) continue;
        group.position.x += minimapShipPosition.x;
        group.position.z += minimapShipPosition.z;
      }
    }

    for (let i = 0; i < DRONE_COUNT; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;
      const phy = physics.current[i];
      let thrusting = false;

      group.getWorldPosition(_pos);
      resolveTargetPos(phy.targetId, _tgt);
      _toTgt.subVectors(_tgt, _pos);
      const dist  = _toTgt.length();
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
            // Close enough and slow enough — park here
            phy.state = 'arrived';
            phy.dwellTimer = 0;
            phy.vel.multiplyScalar(0.05);
          } else if (dist > BRAKE_DIST * 1.4) {
            // Overshot or target moved — resume cruise
            phy.state = 'cruising';
          } else if (speed > 1.0) {
            // Reverse thrust to bleed off speed
            _thrDir.copy(phy.vel).normalize().negate();
            thrusting = steerAndThrust(phy, _thrDir, dt, group);
          }
          break;
        }

        case 'arrived': {
          // Coast to a stop, then wait before re-targeting
          phy.vel.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
          phy.dwellTimer += dt;
          if (phy.dwellTimer > DWELL_TIME) {
            phy.targetId = pickNewTarget(phy.targetId);
            phy.state = 'cruising';
          }
          break;
        }
      }

      // Hard speed cap
      if (speed > MAX_SPEED) phy.vel.multiplyScalar(MAX_SPEED / speed);

      // Integrate rotation and position (Y-plane locked, same as AIShip)
      group.rotation.y += phy.angVel * dt;
      group.position.addScaledVector(phy.vel, dt);
      group.position.y = 0;
      phy.vel.y = 0;

      // Engine glow: bright blue while thrusting, dim idle
      const mat = glowRefs.current[i];
      if (mat) mat.opacity = thrusting ? 0.9 : 0.12;
    }
  });

  return (
    <>
      {spawnPositions.map((pos, i) => (
        <group
          key={i}
          ref={(el: THREE.Group | null) => {
            groupRefs.current[i] = el;
          }}
          position={pos}
        >
          <primitive object={clonedScenes[i]} scale={DRONE_SCALE} />
          {/* Engine exhaust glow — small emissive sphere at the rear */}
          <mesh position={[0, 0, -3]}>
            <sphereGeometry args={[1.2, 6, 6]} />
            <meshBasicMaterial
              ref={(el: THREE.MeshBasicMaterial | null) => {
                glowRefs.current[i] = el;
              }}
              color="#44aaff"
              transparent
              opacity={0.12}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

useGLTF.preload('/supportDrone.glb');
