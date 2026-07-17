import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';

const DEFAULT_URL = '/space_garbage_truck-low.glb';
const DEFAULT_COUNT = 8;
const DEFAULT_SCALE = 0.35;
const DEFAULT_SPAWN_RADIUS = 180;
const DRONE_THRUST = 4.5;
const MAX_SPEED = 28;
const BRAKE_DIST = 40;
const ARRIVE_DIST = 12;
const ARRIVE_SPEED = 4;
const DWELL_TIME = 6;
const YAW_P = 3.2;
const YAW_D = 4.8;

type DroneState = 'cruising' | 'braking' | 'arrived';

interface DronePhy {
  vel: THREE.Vector3;
  angVel: number;
  state: DroneState;
  targetIdx: number;
  dwellTimer: number;
}

export interface GarbageScowDroneFleetProps {
  /** GLB used for each drone (defaults to low-res garbage scow). */
  url?: string;
  count?: number;
  scale?: number;
  /** Center of the spawn ring / patrol volume. */
  spawnCenter?: [number, number, number];
  spawnRadius?: number;
  /**
   * Extra world waypoints drones can visit (e.g. cargo, pad, asteroids).
   * Player position is always included as a live target.
   */
  waypoints?: [number, number, number][];
  /** Register each drone on the drive-signature scanner. */
  registerDriveScan?: boolean;
  idPrefix?: string;
}

const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _toTgt = new THREE.Vector3();
const _thrDir = new THREE.Vector3();
const _localFwd = new THREE.Vector3();

function steerAndThrust(
  phy: DronePhy,
  thrDir: THREE.Vector3,
  dt: number,
  group: THREE.Group
): void {
  const tx = thrDir.x;
  const tz = thrDir.z;
  if (Math.abs(tx) + Math.abs(tz) > 0.01) {
    const targetYaw = Math.atan2(tx, tz);
    let yawErr = targetYaw - group.rotation.y;
    while (yawErr > Math.PI) yawErr -= 2 * Math.PI;
    while (yawErr < -Math.PI) yawErr += 2 * Math.PI;
    phy.angVel += (yawErr * YAW_P - phy.angVel * YAW_D) * dt;
  }

  _localFwd.set(0, 0, -1).applyQuaternion(group.quaternion);
  if (_localFwd.dot(thrDir) < -0.85) {
    phy.vel.addScaledVector(_localFwd, -DRONE_THRUST * dt);
  }
}

/**
 * Local support fleet that patrols around a spawn center.
 * Visuals default to the low-res garbage scow GLB.
 */
export default function GarbageScowDroneFleet({
  url = DEFAULT_URL,
  count = DEFAULT_COUNT,
  scale = DEFAULT_SCALE,
  spawnCenter = [80, 0, 80],
  spawnRadius = DEFAULT_SPAWN_RADIUS,
  waypoints = [],
  registerDriveScan = true,
  idPrefix = 'scow-drone',
}: GarbageScowDroneFleetProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const clonedScenes = useMemo(
    () => Array.from({ length: count }, () => SkeletonUtils.clone(gltf.scene)),
    [gltf.scene, count]
  );

  const spawnPositions = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return [
        spawnCenter[0] + Math.cos(angle) * spawnRadius,
        spawnCenter[1],
        spawnCenter[2] + Math.sin(angle) * spawnRadius,
      ] as [number, number, number];
    });
  }, [count, spawnCenter, spawnRadius]);

  const waypointVecs = useMemo(() => waypoints.map((p) => new THREE.Vector3(...p)), [waypoints]);

  const groupRefs = useRef<(THREE.Group | null)[]>(Array(count).fill(null));
  const physics = useRef<DronePhy[]>(
    Array.from({ length: count }, (_, i) => ({
      vel: new THREE.Vector3(
        Math.sin((i / count) * Math.PI * 2) * 4,
        0,
        Math.cos((i / count) * Math.PI * 2) * 4
      ),
      angVel: 0,
      state: 'cruising' as DroneState,
      targetIdx: i % Math.max(1, waypointVecs.length + 1),
      dwellTimer: 0,
    }))
  );

  // Keep physics array length in sync if count changes.
  useEffect(() => {
    if (physics.current.length === count) return;
    physics.current = Array.from({ length: count }, (_, i) => ({
      vel: new THREE.Vector3(
        Math.sin((i / count) * Math.PI * 2) * 4,
        0,
        Math.cos((i / count) * Math.PI * 2) * 4
      ),
      angVel: 0,
      state: 'cruising' as DroneState,
      targetIdx: i % Math.max(1, waypointVecs.length + 1),
      dwellTimer: 0,
    }));
    groupRefs.current = Array(count).fill(null);
  }, [count, waypointVecs.length]);

  useEffect(() => {
    if (!registerDriveScan) return;
    for (let i = 0; i < count; i++) {
      const idx = i;
      registerDriveSignature({
        id: `${idPrefix}-${i}`,
        label: `SCAVENGER-${String(i + 1).padStart(2, '0')}`,
        getPosition: (target) => {
          const group = groupRefs.current[idx];
          if (group) group.getWorldPosition(target);
          return target;
        },
      });
    }
    return () => {
      for (let i = 0; i < count; i++) {
        unregisterDriveSignature(`${idPrefix}-${i}`);
      }
    };
  }, [count, idPrefix, registerDriveScan]);

  function resolveTarget(phy: DronePhy, out: THREE.Vector3) {
    // Index 0 = live player; remaining indices map into waypoints.
    if (phy.targetIdx <= 0 || waypointVecs.length === 0) {
      out.copy(minimapShipPosition);
      out.y = spawnCenter[1];
      return;
    }
    const wp = waypointVecs[(phy.targetIdx - 1) % waypointVecs.length];
    out.copy(wp);
  }

  function pickNewTarget(current: number): number {
    const total = 1 + waypointVecs.length;
    if (total <= 1) return 0;
    let next = current;
    while (next === current) {
      next = Math.floor(Math.random() * total);
    }
    return next;
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);

    for (let i = 0; i < count; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;
      const phy = physics.current[i];
      if (!phy) continue;

      group.getWorldPosition(_pos);
      resolveTarget(phy, _tgt);
      _toTgt.subVectors(_tgt, _pos);
      const dist = _toTgt.length();
      const speed = phy.vel.length();

      switch (phy.state) {
        case 'cruising': {
          if (dist < BRAKE_DIST) {
            phy.state = 'braking';
          } else if (dist > 1e-3) {
            _thrDir.copy(_toTgt).normalize();
            steerAndThrust(phy, _thrDir, dt, group);
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
            steerAndThrust(phy, _thrDir, dt, group);
          }
          break;
        }
        case 'arrived': {
          phy.vel.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
          phy.dwellTimer += dt;
          if (phy.dwellTimer > DWELL_TIME) {
            phy.targetIdx = pickNewTarget(phy.targetIdx);
            phy.state = 'cruising';
          }
          break;
        }
      }

      if (speed > MAX_SPEED) phy.vel.multiplyScalar(MAX_SPEED / speed);

      group.rotation.y += phy.angVel * dt;
      group.position.addScaledVector(phy.vel, dt);
      group.position.y = spawnCenter[1];
      phy.vel.y = 0;
    }
  });

  return (
    <>
      {spawnPositions.map((pos, i) => (
        <group
          key={`${idPrefix}-${i}`}
          ref={(el: THREE.Group | null) => {
            groupRefs.current[i] = el;
          }}
          position={pos}
          frustumCulled={false}
        >
          <primitive object={clonedScenes[i]} scale={10} rotation={[0, Math.PI / 2, 0]} />
        </group>
      ))}
    </>
  );
}

useGLTF.preload(DEFAULT_URL);
