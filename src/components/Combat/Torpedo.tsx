import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  registerCollidable,
  unregisterCollidable,
} from '../../context/CollisionRegistry';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';
import {
  querySegmentCollidableHit,
  type SegmentHit,
} from '../../utils/collidableSegmentHit';
import { getCollidables } from '../../context/CollisionRegistry';
import {
  TORPEDO_MAX_SPEED,
  TORPEDO_THRUST_ACCELERATION,
  TORPEDO_HORIZONTAL_EJECT_SPEED,
  TORPEDO_VERTICAL_RISE_SPEED,
  TORPEDO_VERTICAL_RISE_HEIGHT,
  TORPEDO_HORIZONTAL_IGNITION_DELAY,
  TORPEDO_VERTICAL_LEVEL_OUT_TIME,
  TORPEDO_TRACKING_INTERVAL,
  TORPEDO_TRACKING_TURN_RATE,
  TORPEDO_TRACKING_CORRECTION_DURATION,
  TORPEDO_COLLISION_RADIUS,
  TORPEDO_COLLISION_HEIGHT,
  TORPEDO_HIT_DAMAGE,
  TORPEDO_MAX_LIFETIME,
  TORPEDO_VISUAL_RADIUS,
  TORPEDO_VISUAL_LENGTH,
  TORPEDO_BODY_COLOR,
  TORPEDO_ENGINE_GLOW_COLOR,
  TORPEDO_ENGINE_GLOW_INTENSITY,
  TORPEDO_ENGINE_GLOW_RADIUS,
  TORPEDO_DRIVE_SIGNATURE_LABEL,
  TORPEDO_PROXIMITY_LABEL,
  EVENT_TORPEDO_HIT,
  type TorpedoLaunchMode,
} from '../../config/torpedoConfig';

// ── State machine phases ────────────────────────────────────────────────────
const PHASE_LOFT = 0;
const PHASE_LEVEL_OUT = 1;
const PHASE_EJECT = 2;
const PHASE_CRUISE = 3;
const PHASE_DETONATED = 4;

type Phase =
  | typeof PHASE_LOFT
  | typeof PHASE_LEVEL_OUT
  | typeof PHASE_EJECT
  | typeof PHASE_CRUISE
  | typeof PHASE_DETONATED;

// ── Module-level scratch vectors (safe — useFrame is synchronous) ───────────
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _desiredDir = new THREE.Vector3();
const _desiredQuat = new THREE.Quaternion();
const _lookMatrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _pos = new THREE.Vector3();

// ── Per-instance mutable state ──────────────────────────────────────────────
interface TorpedoState {
  phase: Phase;
  age: number;
  phaseAge: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  originY: number;
  /** Squared distance to target last frame — used to detect divergence. */
  prevDistSq: number;
}

export interface TorpedoProps {
  id: string;
  mode: TorpedoLaunchMode;
  origin: THREE.Vector3Like;
  launcherVelocity: THREE.Vector3Like;
  launcherForward: THREE.Vector3Like;
  launcherId: string;
  getTargetPosition: (target: THREE.Vector3) => THREE.Vector3;
  onDetonate: (id: string) => void;
}

export default function Torpedo({
  id,
  mode,
  origin,
  launcherVelocity,
  launcherForward,
  launcherId,
  getTargetPosition,
  onDetonate,
}: TorpedoProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const collisionId = `torpedo-${id}`;
  const driveId = `torpedo-drive-${id}`;

  const state = useRef<TorpedoState>({
    phase: mode === 'vertical' ? PHASE_LOFT : PHASE_EJECT,
    age: 0,
    phaseAge: 0,
    px: origin.x,
    py: origin.y,
    pz: origin.z,
    vx:
      mode === 'horizontal'
        ? launcherVelocity.x + launcherForward.x * TORPEDO_HORIZONTAL_EJECT_SPEED
        : launcherVelocity.x,
    vy:
      mode === 'horizontal'
        ? 0
        : launcherVelocity.y + TORPEDO_VERTICAL_RISE_SPEED,
    vz:
      mode === 'horizontal'
        ? launcherVelocity.z + launcherForward.z * TORPEDO_HORIZONTAL_EJECT_SPEED
        : launcherVelocity.z,
    originY: origin.y,
    prevDistSq: Infinity,
  });

  const quatRef = useRef(new THREE.Quaternion());

  // Initialise quaternion to face launch direction (horizontal) or up (vertical).
  useEffect(() => {
    if (mode === 'vertical') {
      _lookMatrix.lookAt(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, -1)
      );
      quatRef.current.setFromRotationMatrix(_lookMatrix);
    } else {
      const fw = new THREE.Vector3(
        launcherForward.x,
        launcherForward.y,
        launcherForward.z
      ).normalize();
      _lookMatrix.lookAt(new THREE.Vector3(0, 0, 0), fw, _up);
      quatRef.current.setFromRotationMatrix(_lookMatrix);
    }
  }, [mode, launcherForward]);

  // Ignore self + launcher in collision tests.
  const ignoreIds = useRef(new Set([launcherId, collisionId]));

  // Register with collision and drive-signature systems.
  useEffect(() => {
    const s = state.current;
    registerCollidable({
      id: collisionId,
      label: TORPEDO_PROXIMITY_LABEL,
      getWorldPosition: (target) => target.set(s.px, s.py, s.pz),
      getWorldQuaternion: (target) => target.copy(quatRef.current),
      getWorldVelocity: (target) => target.set(s.vx, s.vy, s.vz),
      shape: {
        type: 'capsule',
        radius: TORPEDO_COLLISION_RADIUS,
        height: TORPEDO_COLLISION_HEIGHT,
      },
      physicalCollision: true,
    });

    registerDriveSignature({
      id: driveId,
      label: TORPEDO_DRIVE_SIGNATURE_LABEL,
      getPosition: (target) => target.set(s.px, s.py, s.pz),
      getVelocity: (target) => target.set(s.vx, s.vy, s.vz),
    });

    return () => {
      unregisterCollidable(collisionId);
      unregisterDriveSignature(driveId);
    };
  }, [collisionId, driveId]);

  useFrame((_, delta) => {
    const s = state.current;
    if (s.phase === PHASE_DETONATED) return;

    s.age += delta;
    s.phaseAge += delta;

    // ── Lifetime self-destruct ──────────────────────────────────────────
    if (s.age >= TORPEDO_MAX_LIFETIME) {
      detonate(s, null);
      return;
    }

    // ── Phase transitions & thrust logic ────────────────────────────────
    switch (s.phase) {
      case PHASE_LOFT: {
        // Rise vertically until we've gained enough altitude.
        if (s.py >= s.originY + TORPEDO_VERTICAL_RISE_HEIGHT) {
          s.phase = PHASE_LEVEL_OUT;
          s.phaseAge = 0;
        }
        break;
      }

      case PHASE_LEVEL_OUT: {
        // Slerp orientation from "up" toward the target.
        getTargetPosition(_targetPos);
        _desiredDir
          .set(_targetPos.x - s.px, _targetPos.y - s.py, _targetPos.z - s.pz)
          .normalize();
        if (_desiredDir.lengthSq() > 1e-8) {
          _lookMatrix.lookAt(new THREE.Vector3(0, 0, 0), _desiredDir, _up);
          _desiredQuat.setFromRotationMatrix(_lookMatrix);
          quatRef.current.slerp(
            _desiredQuat,
            Math.min(1, TORPEDO_TRACKING_TURN_RATE * delta)
          );
        }

        // Begin forward thrust, blending Y velocity toward 0.
        // Three.js lookAt points −Z toward the target, so forward is (0,0,−1).
        const t = Math.min(s.phaseAge / TORPEDO_VERTICAL_LEVEL_OUT_TIME, 1);
        _forward
          .set(0, 0, -1)
          .applyQuaternion(quatRef.current)
          .normalize();
        const thrust = TORPEDO_THRUST_ACCELERATION * delta;
        s.vx += _forward.x * thrust;
        s.vy += _forward.y * thrust;
        s.vz += _forward.z * thrust;

        if (t >= 1) {
          // Kill any residual vertical drift from the loft phase.
          s.vy = 0;
          s.phase = PHASE_CRUISE;
          s.phaseAge = 0;
          s.trackingTimer = 0;
        }
        break;
      }

      case PHASE_EJECT: {
        // Coast with no acceleration until ignition delay expires.
        if (s.phaseAge >= TORPEDO_HORIZONTAL_IGNITION_DELAY) {
          s.phase = PHASE_CRUISE;
          s.phaseAge = 0;
          s.trackingTimer = 0;
        }
        break;
      }

      case PHASE_CRUISE: {
        // ── Continuous tracking — always face the target ─────────────────
        getTargetPosition(_targetPos);
        const dx = _targetPos.x - s.px;
        const dz = _targetPos.z - s.pz;
        const distSq = dx * dx + dz * dz;
        _desiredDir.set(dx, 0, dz).normalize();

        // Detect divergence: distance increasing means we overshot.
        const diverging = distSq > s.prevDistSq;
        s.prevDistSq = distSq;

        if (_desiredDir.lengthSq() > 1e-8) {
          _lookMatrix.lookAt(new THREE.Vector3(0, 0, 0), _desiredDir, _up);
          _desiredQuat.setFromRotationMatrix(_lookMatrix);

          // How far off-target? (dot=1 → dead on, dot<0 → behind us)
          _forward
            .set(0, 0, -1)
            .applyQuaternion(quatRef.current)
            .normalize();
          const dot = _forward.dot(_desiredDir);

          // Turn rate: base 12/s when off-angle, 4/s when on-target.
          // Diverging: spike to 20/s so it snaps back immediately.
          let turnRate: number;
          if (diverging) {
            turnRate = 20;
          } else {
            turnRate = THREE.MathUtils.lerp(12, 4, Math.max(0, dot));
          }
          quatRef.current.slerp(
            _desiredQuat,
            Math.min(1, turnRate * delta)
          );

          // Bleed speed when off-angle to tighten the turn.
          // Diverging: brake hard to 20% so it can whip around.
          const speedFraction = diverging
            ? 0.2
            : THREE.MathUtils.lerp(0.3, 1, Math.max(0, dot));
          const curSpeed = Math.hypot(s.vx, s.vy, s.vz);
          if (curSpeed > 1e-6) {
            const desiredSpeed = TORPEDO_MAX_SPEED * speedFraction;
            if (curSpeed > desiredSpeed) {
              const brake = Math.max(desiredSpeed / curSpeed, 1 - 8 * delta);
              s.vx *= brake;
              s.vy *= brake;
              s.vz *= brake;
            }
          }
        }

        // ── Forward thrust (always applied, speed clamped afterward) ────
        _forward
          .set(0, 0, -1)
          .applyQuaternion(quatRef.current)
          .normalize();
        // Boost thrust when diverging to reacquire faster.
        const thrustMult = diverging ? 3 : 1;
        const thrust = TORPEDO_THRUST_ACCELERATION * thrustMult * delta;
        s.vx += _forward.x * thrust;
        s.vy += _forward.y * thrust;
        s.vz += _forward.z * thrust;
        const speed = Math.hypot(s.vx, s.vy, s.vz);
        if (speed > TORPEDO_MAX_SPEED) {
          const scale = TORPEDO_MAX_SPEED / speed;
          s.vx *= scale;
          s.vy *= scale;
          s.vz *= scale;
        }
        break;
      }
    }

    // ── Integrate position ──────────────────────────────────────────────
    _from.set(s.px, s.py, s.pz);
    s.px += s.vx * delta;
    s.py += s.vy * delta;
    s.pz += s.vz * delta;

    // Clamp to launch altitude — torpedo stays level.
    s.py = s.originY;
    s.vy = 0;

    _to.set(s.px, s.py, s.pz);

    // ── Swept collision test ────────────────────────────────────────────
    const collidables = getCollidables();
    const hit = querySegmentCollidableHit(_from, _to, {
      radiusPad: TORPEDO_COLLISION_RADIUS,
      ignoreIds: ignoreIds.current,
      hitPoint: _hitPoint,
      hitNormal: _hitNormal,
      collidables,
    });

    if (hit) {
      s.px = hit.point.x;
      s.py = hit.point.y;
      s.pz = hit.point.z;
      detonate(s, hit);
      return;
    }

    // ── Update mesh transform ───────────────────────────────────────────
    if (meshRef.current) {
      meshRef.current.position.set(s.px, s.py, s.pz);
      meshRef.current.quaternion.copy(quatRef.current);
    }

    // ── Engine glow opacity (only when thrusting) ───────────────────────
    if (glowRef.current) {
      const engineOn =
        s.phase === PHASE_CRUISE || s.phase === PHASE_LEVEL_OUT;
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = engineOn ? 1 : 0;
    }
  });

  function detonate(s: TorpedoState, hit: SegmentHit | null) {
    s.phase = PHASE_DETONATED;

    window.dispatchEvent(
      new CustomEvent(EVENT_TORPEDO_HIT, {
        detail: {
          torpedoId: id,
          collidableId: hit?.collidable.id ?? null,
          label: hit?.collidable.label ?? null,
          damage: TORPEDO_HIT_DAMAGE,
          point: { x: s.px, y: s.py, z: s.pz },
          normal: hit
            ? { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z }
            : { x: 0, y: 1, z: 0 },
        },
      })
    );

    onDetonate(id);
  }

  return (
    <group ref={meshRef} position={[origin.x, origin.y, origin.z]}>
      {/* Torpedo body — capsule is Y-aligned; rotate 90° so it lies along −Z (flight forward). */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry
          args={[TORPEDO_VISUAL_RADIUS, TORPEDO_VISUAL_LENGTH, 4, 8]}
        />
        <meshStandardMaterial color={TORPEDO_BODY_COLOR} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Engine glow (rear, +Z after the body rotation) — additive sphere */}
      <mesh ref={glowRef} position={[0, 0, TORPEDO_VISUAL_LENGTH / 2 + TORPEDO_VISUAL_RADIUS]}>
        <sphereGeometry args={[TORPEDO_ENGINE_GLOW_RADIUS, 8, 8]} />
        <meshBasicMaterial
          color={TORPEDO_ENGINE_GLOW_COLOR}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Engine point light */}
      <pointLight
        color={TORPEDO_ENGINE_GLOW_COLOR}
        intensity={TORPEDO_ENGINE_GLOW_INTENSITY}
        distance={20}
        decay={2}
        position={[0, 0, TORPEDO_VISUAL_LENGTH / 2 + TORPEDO_VISUAL_RADIUS]}
      />
    </group>
  );
}
