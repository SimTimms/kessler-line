import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import NpcMachineGuns, { type NpcWeaponState } from '../Combat/NpcMachineGuns';
import ThrusterParticles from '../Ship/ThrusterParticles';
import {
  getCollidables,
  registerCollidable,
  unregisterCollidable,
  type ColliderShape,
} from '../../context/CollisionRegistry';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { SHIP_COLLISION_ID, shipDestroyed, shipVelocity } from '../../context/ShipState';
import {
  CANNON_TARGET_HIT_DAMAGE,
  CANNON_TARGET_HULL_MAX,
  EVENT_CANNON_BULLET_HIT,
  EVENT_VESSEL_BREAKUP,
  NPC_FIGHTER_ALIGN_YAW_RAD,
  NPC_FIGHTER_ANGULAR_DAMP,
  NPC_FIGHTER_ANGULAR_DAMP_ALIGNED,
  NPC_FIGHTER_AVOID_CLEARANCE,
  NPC_FIGHTER_AVOID_LOOKAHEAD,
  NPC_FIGHTER_AVOID_LOOKAHEAD_TIME,
  NPC_FIGHTER_AVOID_WEIGHT,
  NPC_FIGHTER_BURST_DURATION_MAX,
  NPC_FIGHTER_BURST_DURATION_MIN,
  NPC_FIGHTER_BURST_GAP_MAX,
  NPC_FIGHTER_BURST_GAP_MIN,
  NPC_FIGHTER_CLOSING_SPEED,
  NPC_FIGHTER_FIRE_CONE_DEG,
  NPC_FIGHTER_GUN_RANGE,
  NPC_FIGHTER_LINEAR_DAMP,
  NPC_FIGHTER_LINEAR_DAMP_ON_TRAJECTORY,
  NPC_FIGHTER_MANEUVER_THRUST_CAP,
  NPC_FIGHTER_STANDOFF,
  NPC_FIGHTER_STANDOFF_BAND,
  NPC_FIGHTER_THRUST_MULT_MAX,
  NPC_FIGHTER_THRUST_MULT_MIN,
  NPC_FIGHTER_TRAJECTORY_VEL_EPS,
} from '../../config/combatConfig';
import { FUEL_BURN_RATE, O2_DRAIN_RATE } from '../../config/damageConfig';
import {
  MAX_YAW_RATE,
  PLAYER_SHIP_AMMO_START,
  SHIP_BOX_HALF_EXTENTS,
  THRUST,
  YAW_THRUST,
} from '../../config/shipConfig';

interface NpcFighterProps {
  id: string;
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** Same GLB orientation as the player shuttle. */
  modelRotation?: [number, number, number];
}

type NpcResources = NpcWeaponState & {
  hull: number;
  fuel: number;
  o2: number;
};

const _npcPos = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _toPlayerDir = new THREE.Vector3();
const _desiredVel = new THREE.Vector3();
const _velError = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _localPlusZ = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _obsPos = new THREE.Vector3();
const _toObs = new THREE.Vector3();
const _avoid = new THREE.Vector3();
const _lateral = new THREE.Vector3();
const _heading = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

const SHIP_HALF_DIAG = Math.hypot(...SHIP_BOX_HALF_EXTENTS);

function approxObstacleRadius(shape: ColliderShape): number {
  if (shape.type === 'sphere') return shape.radius;
  if (shape.type === 'box') {
    const h = shape.halfExtents;
    return Math.hypot(h.x, h.y, h.z);
  }
  return shape.radius + shape.height * 0.5;
}

function isDockingBay(id: string): boolean {
  return id.startsWith('docking-bay-');
}

/**
 * Player-class hostile shuttle: closes to a standoff, steers around
 * collision meshes with the same fwd/rev/strafe/yaw thrusters as the player,
 * and opens twin MGs when the player is in cone / range.
 */
export default function NpcFighter({
  id,
  url,
  position,
  rotation = [0, Math.PI, 0],
  scale = 1,
  modelRotation = [0, Math.PI / 2, 0],
}: NpcFighterProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null!);
  const alive = useRef(true);

  const npcVel = useRef(new THREE.Vector3());
  const angVel = useRef(0);
  const wantsFire = useRef(false);
  /** Current thrust dial (0.5–10), adjusted each frame from engagement needs. */
  const thrustMultiplier = useRef(1);
  /** true = firing a burst; false = waiting out the gap. */
  const burstActive = useRef(false);
  const burstTimer = useRef(0);

  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false);
  const thrustRight = useRef(false);
  const thrustStrafeLeft = useRef(false);
  const thrustStrafeRight = useRef(false);

  const resources = useRef<NpcResources>({
    hull: CANNON_TARGET_HULL_MAX,
    fuel: 100,
    o2: 100,
    power: 100,
    ammo: PLAYER_SHIP_AMMO_START,
  });

  const collisionId = `npc-fighter-${id}`;
  const ignoreIds = useMemo(() => new Set([collisionId]), [collisionId]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    registerCollidable({
      id: collisionId,
      label: 'Hostile Fighter',
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      getWorldVelocity: (target) => target.copy(npcVel.current),
      shape: {
        type: 'box',
        halfExtents: new THREE.Vector3(...SHIP_BOX_HALF_EXTENTS),
      },
      getObject3D: () => groupRef.current,
    });
    return () => unregisterCollidable(collisionId);
  }, [collisionId]);

  useEffect(() => {
    const sigId = `drive-sig-${collisionId}`;
    registerDriveSignature({
      id: sigId,
      label: 'Hostile Drive',
      getPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getVelocity: (target) => target.copy(npcVel.current),
    });
    return () => unregisterDriveSignature(sigId);
  }, [collisionId]);

  const destroyFighter = useCallback(() => {
    if (!alive.current) return;
    alive.current = false;
    wantsFire.current = false;
    const group = groupRef.current;
    if (group) {
      group.getWorldPosition(_npcPos);
      group.visible = false;
      window.dispatchEvent(
        new CustomEvent(EVENT_VESSEL_BREAKUP, {
          detail: {
            point: { x: _npcPos.x, y: _npcPos.y, z: _npcPos.z },
            velocity: { x: npcVel.current.x, y: npcVel.current.y, z: npcVel.current.z },
          },
        })
      );
    }
    unregisterCollidable(collisionId);
    unregisterDriveSignature(`drive-sig-${collisionId}`);
  }, [collisionId]);

  useEffect(() => {
    const onHit = (event: Event) => {
      const detail = (event as CustomEvent<{ collidableId?: string }>).detail;
      if (detail?.collidableId !== collisionId || !alive.current) return;
      resources.current.hull = Math.max(0, resources.current.hull - CANNON_TARGET_HIT_DAMAGE);
      if (resources.current.hull <= 0) destroyFighter();
    };
    window.addEventListener(EVENT_CANNON_BULLET_HIT, onHit);
    return () => window.removeEventListener(EVENT_CANNON_BULLET_HIT, onHit);
  }, [collisionId, destroyFighter]);

  const getAimTarget = useCallback((out: THREE.Vector3) => out.copy(minimapShipPosition), []);

  useFrame((_, delta) => {
    if (!alive.current || !groupRef.current) return;

    const res = resources.current;
    res.o2 = Math.max(0, res.o2 - O2_DRAIN_RATE * delta);

    const group = groupRef.current;
    group.getWorldPosition(_npcPos);
    _toPlayer.subVectors(minimapShipPosition, _npcPos);
    _toPlayer.y = 0;
    const dist = _toPlayer.length();
    if (dist > 1e-4) _toPlayerDir.copy(_toPlayer).normalize();
    else _toPlayerDir.set(0, 0, 1);

    // ── Obstacle avoidance (steer around registered collision meshes) ─────
    _avoid.set(0, 0, 0);
    const speed = npcVel.current.length();
    const lookAhead =
      NPC_FIGHTER_AVOID_LOOKAHEAD + speed * NPC_FIGHTER_AVOID_LOOKAHEAD_TIME;

    for (const entry of getCollidables()) {
      if (entry.id === collisionId) continue;
      if (entry.id === SHIP_COLLISION_ID) continue; // player handled by standoff
      if (isDockingBay(entry.id)) continue;
      if (entry.physicalCollision === false) continue;

      entry.getWorldPosition(_obsPos);
      _toObs.set(_obsPos.x - _npcPos.x, 0, _obsPos.z - _npcPos.z);
      const obsDist = _toObs.length();
      const clearance =
        SHIP_HALF_DIAG + approxObstacleRadius(entry.shape) + NPC_FIGHTER_AVOID_CLEARANCE;
      const danger = lookAhead + clearance;
      if (obsDist < 1e-3 || obsDist > danger) continue;

      _toObs.multiplyScalar(1 / obsDist);
      // Only care about obstacles roughly ahead of travel / pursuit.
      const aheadDot = Math.max(_toObs.dot(_toPlayerDir), _toObs.dot(_nose.set(0, 0, -1).applyQuaternion(group.quaternion)));
      if (aheadDot < -0.15 && obsDist > clearance * 1.2) continue;

      const t = 1 - obsDist / danger;
      const strength = t * t * NPC_FIGHTER_AVOID_WEIGHT;

      // Lateral slide around the obstacle (prefer the side that keeps progress to player).
      _lateral.crossVectors(_up, _toObs);
      if (_lateral.lengthSq() < 1e-8) _lateral.set(1, 0, 0);
      else _lateral.normalize();
      if (_lateral.dot(_toPlayerDir) < 0) _lateral.negate();

      _avoid.addScaledVector(_lateral, strength);
      // Strong push back when inside / near the clearance bubble.
      if (obsDist < clearance * 1.8) {
        _avoid.addScaledVector(_toObs, -strength * 1.4);
      }
    }

    // ── Desired velocity: standoff pursuit + avoidance ────────────────────
    const preferred = NPC_FIGHTER_STANDOFF;
    const band = NPC_FIGHTER_STANDOFF_BAND;
    const closingRate = THREE.MathUtils.clamp(
      ((dist - preferred) / band) * NPC_FIGHTER_CLOSING_SPEED,
      -NPC_FIGHTER_CLOSING_SPEED,
      NPC_FIGHTER_CLOSING_SPEED
    );
    _desiredVel.copy(shipVelocity).addScaledVector(_toPlayerDir, closingRate);
    if (_avoid.lengthSq() > 1e-6) {
      _desiredVel.addScaledVector(_avoid, NPC_FIGHTER_CLOSING_SPEED);
    }
    _desiredVel.y = 0;
    _velError.subVectors(_desiredVel, npcVel.current);
    _velError.y = 0;

    // Heading: face player when clear / in gun range; bias toward avoid when blocked.
    _heading.copy(_toPlayerDir);
    if (_avoid.lengthSq() > 0.05) {
      _heading.add(_avoid).normalize();
    }

    // ── Thrust dial (0.5–10×): burn hard when far / chasing, ease near standoff ─
    const rangeSpan = Math.max(1, NPC_FIGHTER_GUN_RANGE * 2);
    let desiredMult =
      NPC_FIGHTER_THRUST_MULT_MIN +
      (NPC_FIGHTER_THRUST_MULT_MAX - NPC_FIGHTER_THRUST_MULT_MIN) *
        THREE.MathUtils.clamp((dist - preferred) / rangeSpan, 0, 1);
    // Close the gap faster when well outside preferred range.
    if (dist > preferred + band) {
      desiredMult = Math.max(desiredMult, NPC_FIGHTER_THRUST_MULT_MAX * 0.55);
    }
    // Fine control when holding or sliding around obstacles.
    if (dist < preferred + band * 0.5 || _avoid.lengthSq() > 0.2) {
      desiredMult = Math.min(desiredMult, 2.5);
    }
    // Scale up with how large the velocity error is (need more punch to catch up).
    const errSpeed = _velError.length();
    if (errSpeed > NPC_FIGHTER_CLOSING_SPEED) {
      desiredMult = Math.min(
        NPC_FIGHTER_THRUST_MULT_MAX,
        desiredMult + (errSpeed / NPC_FIGHTER_CLOSING_SPEED - 1) * 2
      );
    }
    desiredMult = THREE.MathUtils.clamp(
      desiredMult,
      NPC_FIGHTER_THRUST_MULT_MIN,
      NPC_FIGHTER_THRUST_MULT_MAX
    );
    // Smooth dial changes so it doesn't thrash every frame.
    thrustMultiplier.current = THREE.MathUtils.damp(
      thrustMultiplier.current,
      desiredMult,
      2.5,
      delta
    );
    const forwardMult = thrustMultiplier.current;
    const maneuverMult = Math.min(forwardMult, NPC_FIGHTER_MANEUVER_THRUST_CAP);

    // ── Same thruster model as player ship physics (`step.ts`) ────────────
    _localPlusZ.set(0, 0, 1).applyQuaternion(group.quaternion);
    _localRight.set(1, 0, 0).applyQuaternion(group.quaternion);
    _nose.set(0, 0, -1).applyQuaternion(group.quaternion);

    thrustForward.current = false;
    thrustReverse.current = false;
    thrustLeft.current = false;
    thrustRight.current = false;
    thrustStrafeLeft.current = false;
    thrustStrafeRight.current = false;

    // Yaw toward heading (player yawLeft / yawRight → ±YAW_THRUST × maneuver mult).
    const targetYaw = Math.atan2(-_heading.x, -_heading.z);
    let yawErr = targetYaw - group.rotation.y;
    while (yawErr > Math.PI) yawErr -= 2 * Math.PI;
    while (yawErr < -Math.PI) yawErr += 2 * Math.PI;

    const aligned = Math.abs(yawErr) < NPC_FIGHTER_ALIGN_YAW_RAD;
    // Overshooting: already spinning through the target — don't add more yaw thrust.
    const yawOvershoot = yawErr * angVel.current > 0 && Math.abs(angVel.current) > Math.abs(yawErr) * 5;

    let thrusting = false;
    if (res.fuel > 0) {
      if (!aligned && !yawOvershoot) {
        if (yawErr > 0.04) {
          angVel.current += YAW_THRUST * maneuverMult * delta;
          thrustLeft.current = true;
          thrusting = true;
        } else if (yawErr < -0.04) {
          angVel.current -= YAW_THRUST * maneuverMult * delta;
          thrustRight.current = true;
          thrusting = true;
        }
      }

      // Active counter-yaw when on target but still rotating (braking RCS).
      if (aligned && Math.abs(angVel.current) > 0.04) {
        if (angVel.current > 0) {
          angVel.current -= YAW_THRUST * maneuverMult * delta;
          thrustRight.current = true;
          thrusting = true;
        } else {
          angVel.current += YAW_THRUST * maneuverMult * delta;
          thrustLeft.current = true;
          thrusting = true;
        }
      }

      angVel.current = THREE.MathUtils.clamp(angVel.current, -MAX_YAW_RATE, MAX_YAW_RATE);

      // Deadband so we don't thrash when nearly matched.
      const axialNeed = -_velError.dot(_localPlusZ); // + = need W (forward)
      const strafeNeed = _velError.dot(_localRight); // + = need strafe right

      if (Math.abs(axialNeed) > 1.5) {
        if (axialNeed > 0) {
          npcVel.current.addScaledVector(_localPlusZ, -THRUST * forwardMult * delta);
          thrustForward.current = true;
        } else {
          npcVel.current.addScaledVector(_localPlusZ, THRUST * maneuverMult * delta);
          thrustReverse.current = true;
        }
        thrusting = true;
      }
      if (Math.abs(strafeNeed) > 1.5) {
        if (strafeNeed > 0) {
          npcVel.current.addScaledVector(_localRight, THRUST * maneuverMult * delta);
          thrustStrafeRight.current = true;
        } else {
          npcVel.current.addScaledVector(_localRight, -THRUST * maneuverMult * delta);
          thrustStrafeLeft.current = true;
        }
        thrusting = true;
      }
    } else {
      angVel.current = THREE.MathUtils.clamp(angVel.current, -MAX_YAW_RATE, MAX_YAW_RATE);
    }

    // Artificial drag — unlike debris, this ship bleeds rate when settling.
    const onTrajectory = _velError.length() < NPC_FIGHTER_TRAJECTORY_VEL_EPS;
    const angDamp = aligned ? NPC_FIGHTER_ANGULAR_DAMP_ALIGNED : NPC_FIGHTER_ANGULAR_DAMP;
    angVel.current *= Math.max(0, 1 - angDamp * delta);
    if (aligned && Math.abs(yawErr) < 0.03) {
      // Hard stop residual spin once pointed.
      angVel.current *= Math.max(0, 1 - NPC_FIGHTER_ANGULAR_DAMP_ALIGNED * delta);
    }

    const linDamp = onTrajectory ? NPC_FIGHTER_LINEAR_DAMP_ON_TRAJECTORY : NPC_FIGHTER_LINEAR_DAMP;
    if (onTrajectory) {
      // Pull velocity toward desired path, then damp residual.
      npcVel.current.lerp(_desiredVel, Math.min(1, linDamp * delta));
    }
    npcVel.current.multiplyScalar(Math.max(0, 1 - NPC_FIGHTER_LINEAR_DAMP * delta));

    if (thrusting) {
      res.fuel = Math.max(0, res.fuel - FUEL_BURN_RATE * forwardMult * delta);
    }

    const faceDot = _nose.dot(_toPlayerDir);
    const fireCos = Math.cos(THREE.MathUtils.degToRad(NPC_FIGHTER_FIRE_CONE_DEG));
    const avoidingHard = _avoid.lengthSq() > 0.35;
    const canEngage =
      !shipDestroyed.current &&
      !avoidingHard &&
      dist <= NPC_FIGHTER_GUN_RANGE &&
      faceDot >= fireCos &&
      res.ammo > 0 &&
      res.power > 0 &&
      res.o2 > 0;

    if (!canEngage) {
      // Lose LOS / range — abort burst and wait a fresh gap before opening up again.
      burstActive.current = false;
      burstTimer.current = 0;
      wantsFire.current = false;
    } else {
      burstTimer.current -= delta;
      if (burstTimer.current <= 0) {
        if (burstActive.current) {
          // End of burst → random pause.
          burstActive.current = false;
          burstTimer.current = THREE.MathUtils.randFloat(
            NPC_FIGHTER_BURST_GAP_MIN,
            NPC_FIGHTER_BURST_GAP_MAX
          );
        } else {
          // End of gap → random burst length.
          burstActive.current = true;
          burstTimer.current = THREE.MathUtils.randFloat(
            NPC_FIGHTER_BURST_DURATION_MIN,
            NPC_FIGHTER_BURST_DURATION_MAX
          );
        }
      }
      wantsFire.current = burstActive.current;
    }

    group.rotation.y += angVel.current * delta;
    group.position.addScaledVector(npcVel.current, delta);
    group.position.y = 0;
    npcVel.current.y = 0;
  });

  return (
    <>
      <group ref={groupRef} position={position} rotation={rotation}>
        <primitive object={scene} scale={scale} rotation={modelRotation} castShadow />
        <ThrusterParticles
          thrustForward={thrustForward}
          thrustReverse={thrustReverse}
          thrustLeft={thrustLeft}
          thrustRight={thrustRight}
          thrustStrafeLeft={thrustStrafeLeft}
          thrustStrafeRight={thrustStrafeRight}
          shipVelocityRef={npcVel}
          driveFromProps
          thrustMultiplierRef={thrustMultiplier}
        />
      </group>
      <NpcMachineGuns
        shipGroupRef={groupRef}
        shipVelocityRef={npcVel}
        resources={resources}
        getAimTarget={getAimTarget}
        wantsFire={wantsFire}
        ignoreIds={ignoreIds}
      />
    </>
  );
}

useGLTF.preload('/shuttle-low-british.glb');
