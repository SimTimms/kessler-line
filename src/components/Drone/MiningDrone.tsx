import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { shipPosRef } from '../../context/ShipPos';
import { shipVelocity } from '../../context/ShipState';
import {
  registerCollidable,
  unregisterCollidable,
  getCollidables,
} from '../../context/CollisionRegistry';
import {
  applyDroneHullDamage,
  burnDroneFuel,
  ensureMiningDroneDockRegistered,
  EVENT_DRONE_COMMAND,
  getDroneFuel,
  getDroneMode,
  getDroneTargetId,
  notifyDroneDocked,
  notifyDroneStowed,
  resetDroneState,
  type DroneCommand,
} from '../../context/DroneStore';
import {
  DRONE_ARRIVE_DIST,
  DRONE_ARRIVE_SPEED,
  DRONE_BAY_OFFSET,
  DRONE_BRAKE_DIST,
  DRONE_CLAMP_MAX_RELATIVE_SPEED,
  DRONE_CRASH_DAMAGE_PER_SPEED,
  DRONE_CRASH_SPEED,
  DRONE_FUEL_BURN_PER_SEC,
  DRONE_MAX_SPEED,
  DRONE_THRUST,
  DRONE_YAW_D,
  DRONE_YAW_P,
  MINING_DRONE_COLLISION_RADIUS,
  MINING_DRONE_ID,
  MINING_DRONE_LABEL,
  MINING_DRONE_MODEL_URL,
  MINING_DRONE_SCALE,
} from '../../config/droneConfig';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';

type FlightPhase = 'stowed' | 'cruise' | 'brake' | 'attached' | 'destroyed';

const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _toTgt = new THREE.Vector3();
const _thrDir = new THREE.Vector3();
const _localFwd = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _otherPos = new THREE.Vector3();
const _otherVel = new THREE.Vector3();
const _bay = new THREE.Vector3();
const _surfaceOffset = new THREE.Vector3();

function bayWorldPosition(out: THREE.Vector3): THREE.Vector3 {
  return out
    .copy(shipPosRef.current)
    .add(_bay.set(DRONE_BAY_OFFSET[0], DRONE_BAY_OFFSET[1], DRONE_BAY_OFFSET[2]));
}

function colliderRadius(entry: ReturnType<typeof getCollidables>[number]): number {
  if (entry.shape.type === 'sphere') return entry.shape.radius;
  if (entry.shape.type === 'box') {
    return Math.max(entry.shape.halfExtents.x, entry.shape.halfExtents.z);
  }
  return entry.shape.radius;
}

export default function MiningDrone() {
  const gltf = useGLTF(MINING_DRONE_MODEL_URL) as unknown as { scene: THREE.Group };
  // SkeletonUtils.clone: shared useGLTF cache + skinned meshes (same pattern as
  // SupportDroneFleet / StationDrones). Never mount gltf.scene directly.
  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene);
    cloned.traverse((child) => {
      child.frustumCulled = false;
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);
  const velRef = useRef(new THREE.Vector3());
  const angVelRef = useRef(0);
  const phaseRef = useRef<FlightPhase>('stowed');
  const lastCrashAtRef = useRef(0);

  useEffect(() => {
    ensureMiningDroneDockRegistered();
    resetDroneState();
    const group = groupRef.current;
    if (group) {
      bayWorldPosition(_pos);
      group.position.copy(_pos);
      group.rotation.set(0, 0, 0);
    }
    phaseRef.current = 'stowed';
    velRef.current.set(0, 0, 0);

    registerDriveSignature({
      id: MINING_DRONE_ID,
      label: MINING_DRONE_LABEL,
      getPosition: (target) => {
        groupRef.current?.getWorldPosition(target);
        return target;
      },
    });

    registerCollidable({
      id: `${MINING_DRONE_ID}-hull`,
      label: MINING_DRONE_LABEL,
      shape: { type: 'sphere', radius: MINING_DRONE_COLLISION_RADIUS },
      physicalCollision: false,
      getWorldPosition: (target) => {
        groupRef.current?.getWorldPosition(target);
        return target;
      },
      getWorldVelocity: (target) => target.copy(velRef.current),
      getObject3D: () => groupRef.current,
    });

    return () => {
      unregisterDriveSignature(MINING_DRONE_ID);
      unregisterCollidable(`${MINING_DRONE_ID}-hull`);
    };
  }, []);

  useEffect(() => {
    const onCommand = (e: Event) => {
      const detail = (e as CustomEvent<DroneCommand>).detail;
      if (!detail) return;
      const group = groupRef.current;
      if (!group) return;

      if (detail.type === 'launch') {
        if (phaseRef.current !== 'stowed') return;
        bayWorldPosition(_pos);
        group.position.copy(_pos);
        velRef.current.copy(shipVelocity);
        phaseRef.current = 'cruise';
      } else if (detail.type === 'recall') {
        if (phaseRef.current === 'destroyed' || phaseRef.current === 'stowed') return;
        group.getWorldPosition(_pos);
        group.position.copy(_pos);
        phaseRef.current = 'cruise';
        velRef.current.multiplyScalar(0.2);
      }
    };
    window.addEventListener(EVENT_DRONE_COMMAND, onCommand);
    return () => window.removeEventListener(EVENT_DRONE_COMMAND, onCommand);
  }, []);

  function resolveTargetPosition(out: THREE.Vector3): boolean {
    const mode = getDroneMode();
    if (mode === 'recalling' || mode === 'stowed') {
      bayWorldPosition(out);
      return true;
    }
    const targetId = getDroneTargetId();
    if (!targetId) return false;
    const entry = getCollidables().find((c) => c.id === targetId);
    if (!entry) return false;
    entry.getWorldPosition(out);
    return true;
  }

  function getTargetVelocity(out: THREE.Vector3): void {
    if (getDroneMode() === 'recalling') {
      out.copy(shipVelocity);
      return;
    }
    const targetId = getDroneTargetId();
    const entry = targetId ? getCollidables().find((c) => c.id === targetId) : undefined;
    if (entry?.getWorldVelocity) {
      entry.getWorldVelocity(out);
    } else {
      out.set(0, 0, 0);
    }
  }

  function steerAndThrust(thrDir: THREE.Vector3, dt: number, group: THREE.Group): void {
    if (getDroneFuel() <= 0) return;
    const tx = thrDir.x;
    const tz = thrDir.z;
    if (Math.abs(tx) + Math.abs(tz) > 0.01) {
      const targetYaw = Math.atan2(tx, tz);
      let yawErr = targetYaw - group.rotation.y;
      while (yawErr > Math.PI) yawErr -= 2 * Math.PI;
      while (yawErr < -Math.PI) yawErr += 2 * Math.PI;
      angVelRef.current += (yawErr * DRONE_YAW_P - angVelRef.current * DRONE_YAW_D) * dt;
    }
    _localFwd.set(0, 0, -1).applyQuaternion(group.quaternion);
    const align = _localFwd.dot(thrDir);
    if (align > 0.55) {
      velRef.current.addScaledVector(_localFwd, DRONE_THRUST * dt);
      burnDroneFuel(DRONE_FUEL_BURN_PER_SEC * dt);
    } else if (align < -0.55) {
      velRef.current.addScaledVector(_localFwd, -DRONE_THRUST * dt);
      burnDroneFuel(DRONE_FUEL_BURN_PER_SEC * dt);
    }
  }

  function completeDock(targetId: string, label: string) {
    const group = groupRef.current;
    if (!group) return;
    velRef.current.set(0, 0, 0);
    angVelRef.current = 0;
    phaseRef.current = 'attached';
    notifyDroneDocked(targetId, label);
  }

  function completeStow() {
    const group = groupRef.current;
    if (!group) return;
    bayWorldPosition(_pos);
    group.position.copy(_pos);
    velRef.current.set(0, 0, 0);
    angVelRef.current = 0;
    phaseRef.current = 'stowed';
    notifyDroneStowed();
  }

  function checkCollisions() {
    const group = groupRef.current;
    if (!group || phaseRef.current === 'attached' || phaseRef.current === 'destroyed') return;
    if (performance.now() - lastCrashAtRef.current < 400) return;

    group.getWorldPosition(_pos);
    const targetId = getDroneTargetId();

    for (const entry of getCollidables()) {
      if (entry.id === `${MINING_DRONE_ID}-hull`) continue;
      if (entry.physicalCollision === false) continue;

      entry.getWorldPosition(_otherPos);
      const hitDist = colliderRadius(entry) + MINING_DRONE_COLLISION_RADIUS;
      if (_pos.distanceTo(_otherPos) > hitDist) continue;

      if (entry.getWorldVelocity) entry.getWorldVelocity(_otherVel);
      else _otherVel.set(0, 0, 0);
      _relVel.copy(velRef.current).sub(_otherVel);
      const impactSpeed = _relVel.length();

      if (
        entry.id === targetId &&
        impactSpeed <= DRONE_CLAMP_MAX_RELATIVE_SPEED &&
        (getDroneMode() === 'approaching' ||
          phaseRef.current === 'brake' ||
          phaseRef.current === 'cruise')
      ) {
        completeDock(entry.id, entry.label ?? entry.id);
        return;
      }

      if (impactSpeed >= DRONE_CRASH_SPEED) {
        applyDroneHullDamage((impactSpeed - DRONE_CRASH_SPEED) * DRONE_CRASH_DAMAGE_PER_SPEED);
        lastCrashAtRef.current = performance.now();
        _thrDir.subVectors(_pos, _otherPos);
        if (_thrDir.lengthSq() > 1e-6) {
          _thrDir.normalize();
          velRef.current.copy(_thrDir).multiplyScalar(Math.min(impactSpeed * 0.35, 8));
        }
        if (getDroneMode() === 'destroyed') {
          phaseRef.current = 'destroyed';
        }
        return;
      }
    }
  }

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.033);
    const mode = getDroneMode();

    if (mode === 'destroyed' || phaseRef.current === 'destroyed') {
      group.visible = false;
      return;
    }
    group.visible = true;

    if (mode === 'stowed') {
      phaseRef.current = 'stowed';
      bayWorldPosition(_pos);
      group.position.copy(_pos);
      velRef.current.copy(shipVelocity);
      return;
    }

    // Docked / mining: physics off, stay attached to target surface.
    if ((mode === 'docked' || mode === 'mining') && phaseRef.current === 'attached') {
      const targetId = getDroneTargetId();
      const entry = targetId ? getCollidables().find((c) => c.id === targetId) : undefined;
      if (entry) {
        entry.getWorldPosition(_tgt);
        const radius = colliderRadius(entry) * 0.55;
        _surfaceOffset.copy(shipPosRef.current).sub(_tgt);
        if (_surfaceOffset.lengthSq() > 1e-6) {
          _surfaceOffset.normalize();
          group.position.copy(_tgt).addScaledVector(_surfaceOffset, radius);
        } else {
          group.position.copy(_tgt).addScaledVector(_surfaceOffset.set(0, 1, 0), radius);
        }
      }
      velRef.current.set(0, 0, 0);
      return;
    }

    if (!resolveTargetPosition(_tgt)) return;
    group.getWorldPosition(_pos);
    _toTgt.subVectors(_tgt, _pos);
    const dist = _toTgt.length();
    getTargetVelocity(_otherVel);
    _relVel.copy(velRef.current).sub(_otherVel);
    const relSpeed = _relVel.length();
    const speed = velRef.current.length();

    if (mode === 'recalling' && dist < DRONE_ARRIVE_DIST && relSpeed < DRONE_ARRIVE_SPEED) {
      completeStow();
      return;
    }

    if (mode === 'approaching' && dist < DRONE_ARRIVE_DIST && relSpeed < DRONE_ARRIVE_SPEED) {
      const targetId = getDroneTargetId();
      const entry = targetId ? getCollidables().find((c) => c.id === targetId) : undefined;
      if (entry) {
        completeDock(entry.id, entry.label ?? entry.id);
        return;
      }
    }

    const braking =
      dist < DRONE_BRAKE_DIST || (mode === 'approaching' && relSpeed > Math.max(2, dist * 0.35));

    if (braking) {
      phaseRef.current = 'brake';
      if (relSpeed > 0.4) {
        _thrDir.copy(_relVel).normalize().negate();
        steerAndThrust(_thrDir, dt, group);
      } else if (dist > DRONE_ARRIVE_DIST && _toTgt.lengthSq() > 1e-6) {
        _thrDir.copy(_toTgt).normalize();
        steerAndThrust(_thrDir, dt, group);
      }
    } else {
      phaseRef.current = 'cruise';
      if (dist > 1e-3) {
        _thrDir.copy(_toTgt).normalize();
        steerAndThrust(_thrDir, dt, group);
      }
    }

    if (speed > DRONE_MAX_SPEED) {
      velRef.current.multiplyScalar(DRONE_MAX_SPEED / speed);
    }

    group.rotation.y += angVelRef.current * dt;
    group.position.addScaledVector(velRef.current, dt);
    checkCollisions();
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      <primitive
        object={model}
        scale={MINING_DRONE_SCALE}
        // Match StationDrones orientation for `/drone/untitled.gltf`.
        rotation={[-Math.PI * 0.5, Math.PI, 0]}
      />
    </group>
  );
}

useGLTF.preload(MINING_DRONE_MODEL_URL);
