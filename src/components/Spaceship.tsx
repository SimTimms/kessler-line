import { useRef, useEffect, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ThrusterParticles from './ThrusterParticles';
import DockingReleaseParticles from './DockingReleaseParticles';
import {
  getCollidables,
  registerCollidable,
  unregisterCollidable,
} from '../context/CollisionRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { driveSignatureOnRef } from '../context/DriveSignatureScan';

export const THRUST = 2.2; // units per second²
const YAW_THRUST = 1.0; // radians per second²
export const SHIP_RADIUS = 3; // bounding sphere radius (world units, tune as needed)
const RESTITUTION = 0.4; // bounciness: 0 = dead stop, 1 = elastic
const DAMAGE_MULTIPLIER = 1.2; // hull damage = impactSpeed * multiplier (impulse; 500 m/s = 100 dmg)
const SHIP_COLLISION_ID = 'spaceship';
const DOCKING_PORT_RADIUS = 2; // port detection sphere radius (world units)
const DOCKING_PORT_LOCAL_Z = 9; // local -Z = world forward; tune to align with ship nose

export let power = 100; // global: 0–100, decreases by 1 per active thrust key per second
export let hullIntegrity = 100; // global: 0–100, decreases on collision
export let fuel = 100; // global: 0–100, drains while thrusting, refills via Refuel button
export let o2 = 100; // global: 0–100, depletes constantly, refills via Transfer O2 button
export const shipVelocity = new THREE.Vector3(); // updated each frame; read by HUD
export const shipAcceleration = { current: 0 }; // instantaneous linear acceleration magnitude (units/s²); read by GForceFog
export const shipQuaternion = new THREE.Quaternion(); // updated each frame; read by EjectedCargo

export const isRefueling = { current: false }; // set by Refuel button while docked
export const isTransferringO2 = { current: false }; // set by Transfer O2 button while docked
export const thrustMultiplier = { current: 1 }; // set by thrust slider in App.tsx; range 0.5–50
export const shipDestroyed = { current: false }; // set true when hull reaches 0

export function drainPower(amount: number) {
  power = Math.max(0, power - amount);
}

export function damageHull(amount: number) {
  hullIntegrity = Math.max(0, hullIntegrity - amount);
}

interface SpaceshipProps {
  url: string;
  scale?: number;
  positionRef?: { current: THREE.Vector3 };
  shipGroupRef?: { current: THREE.Group | null };
}

export default function Spaceship({ url, scale = 1, positionRef, shipGroupRef }: SpaceshipProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null!);

  // Fill the external shipGroupRef (if provided) so LaserRay can read world transform.
  // Also register/unregister the ship's own collision sphere in the registry.
  const setGroupRef = useCallback(
    (el: THREE.Group | null) => {
      groupRef.current = el!;
      if (shipGroupRef) shipGroupRef.current = el;
      if (el) {
        registerCollidable({
          id: SHIP_COLLISION_ID,
          getWorldPosition: (target) => {
            if (groupRef.current) groupRef.current.getWorldPosition(target);
            return target;
          },
          shape: { type: 'box', halfExtents: new THREE.Vector3(9, 3, 10) },
        });
      } else {
        unregisterCollidable(SHIP_COLLISION_ID);
      }
    },
    [shipGroupRef]
  );

  const velocity = useRef(new THREE.Vector3());
  const angularVelocity = useRef(0); // yaw rate in radians/second — no drag, persists like linear velocity
  const dockedTo = useRef<string | null>(null); // collision ID of the bay we're locked to, or null
  const dockingPortRef = useRef<THREE.Group>(null!); // group at ship nose for docking detection
  const _portWorldPos = useRef(new THREE.Vector3());
  const _localForward = useRef(new THREE.Vector3()); // reused each frame to avoid GC
  const _localRight = useRef(new THREE.Vector3());
  const _shipWorldPos = useRef(new THREE.Vector3());
  const _collidablePos = useRef(new THREE.Vector3());
  const _collisionNormal = useRef(new THREE.Vector3());
  const _boxQuat = useRef(new THREE.Quaternion());
  const _invBoxQuat = useRef(new THREE.Quaternion());
  const _localShipPos = useRef(new THREE.Vector3());
  const _closestPoint = useRef(new THREE.Vector3());
  const _localUp = useRef(new THREE.Vector3());
  const _capsuleA = useRef(new THREE.Vector3());
  const _capsuleB = useRef(new THREE.Vector3());
  const releaseParticleTrigger = useRef(false);
  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false); // A: left-front thruster fires → rotates right (clockwise from above)
  const thrustRight = useRef(false); // D: right-front thruster fires → rotates left
  const thrustStrafeLeft = useRef(false); // Q: strafe port (lateral left)
  const thrustStrafeRight = useRef(false); // E: strafe starboard (lateral right)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = true;
      if (e.code === 'KeyS') thrustReverse.current = true;
      if (e.code === 'KeyA') thrustLeft.current = true;
      if (e.code === 'KeyD') thrustRight.current = true;
      if (e.code === 'KeyE') thrustStrafeLeft.current = true;
      if (e.code === 'KeyQ') thrustStrafeRight.current = true;
      if (e.code === 'Space' && dockedTo.current) {
        dockedTo.current = null; // release from dock
        window.dispatchEvent(new CustomEvent('ShipUndocked'));
        // Push ship away from docking bay along its local forward direction
        if (groupRef.current) {
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
          velocity.current.copy(forward.multiplyScalar(4)); // 4 m/s release velocity
        }
        releaseParticleTrigger.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = false;
      if (e.code === 'KeyS') thrustReverse.current = false;
      if (e.code === 'KeyA') thrustLeft.current = false;
      if (e.code === 'KeyD') thrustRight.current = false;
      if (e.code === 'KeyE') thrustStrafeLeft.current = false;
      if (e.code === 'KeyQ') thrustStrafeRight.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (shipDestroyed.current) return;

    // ---- DOCKED: follow the bay's world position and rotation, ignore all physics ----
    if (dockedTo.current) {
      const dockerEntry = getCollidables().find((c) => c.id === dockedTo.current);
      if (dockerEntry) {
        dockerEntry.getWorldPosition(_collidablePos.current);
        if (dockerEntry.getWorldQuaternion) {
          dockerEntry.getWorldQuaternion(_boxQuat.current);
          groupRef.current.quaternion.copy(_boxQuat.current);
        }
        // Recompute position every frame from the current bay quaternion so the
        // docking port stays pinned at the bay center even as the station rotates.
        _localForward.current.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat.current);
        groupRef.current.position.copy(_collidablePos.current).sub(_localForward.current);
      }
      shipVelocity.set(0, 0, 0);
      shipAcceleration.current = 0;
      if (isRefueling.current) fuel = Math.min(100, fuel + 10 * delta);
      if (isTransferringO2.current) o2 = Math.min(100, o2 + 10 * delta);
      o2 = Math.max(0, o2 - 1 * delta);
      if (positionRef) positionRef.current.copy(groupRef.current.position);
      minimapShipPosition.copy(groupRef.current.position);
      return;
    }

    // Yaw: accumulate angular velocity (no drag — mirrors linear physics)
    // A: clockwise from above = negative Y rotation
    // D: counter-clockwise from above = positive Y rotation
    if (thrustLeft.current) angularVelocity.current -= YAW_THRUST * delta;
    if (thrustRight.current) angularVelocity.current += YAW_THRUST * delta;
    groupRef.current.rotation.y += angularVelocity.current * delta;

    // Linear thrust along ship's current local forward (so rotation changes thrust direction)
    _localForward.current.set(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
    if (thrustForward.current)
      velocity.current.addScaledVector(
        _localForward.current,
        THRUST * thrustMultiplier.current * delta
      );
    if (thrustReverse.current)
      velocity.current.addScaledVector(
        _localForward.current,
        -THRUST * thrustMultiplier.current * delta
      );

    // Lateral (strafe) thrust along ship's local right axis
    _localRight.current.set(1, 0, 0).applyQuaternion(groupRef.current.quaternion);
    if (thrustStrafeLeft.current)
      velocity.current.addScaledVector(_localRight.current, -THRUST * delta);
    if (thrustStrafeRight.current)
      velocity.current.addScaledVector(_localRight.current, THRUST * delta);

    // No drag — space physics: velocity and angular velocity carry on indefinitely
    groupRef.current.position.addScaledVector(velocity.current, delta);
    shipVelocity.copy(velocity.current);
    groupRef.current.getWorldQuaternion(shipQuaternion);

    // Track linear acceleration magnitude for G-force fog effect
    const isLinearThrusting =
      thrustForward.current ||
      thrustReverse.current ||
      thrustStrafeLeft.current ||
      thrustStrafeRight.current;
    shipAcceleration.current = isLinearThrusting ? THRUST * thrustMultiplier.current : 0;

    // Power and fuel drain: 1 unit per active thrust key per second
    const keysHeld =
      (thrustForward.current ? 1 : 0) +
      (thrustReverse.current ? 1 : 0) +
      (thrustLeft.current ? 1 : 0) +
      (thrustRight.current ? 1 : 0) +
      (thrustStrafeLeft.current ? 1 : 0) +
      (thrustStrafeRight.current ? 1 : 0);
    if (keysHeld > 0) {
      power = Math.max(0, power - keysHeld * delta);
      fuel = Math.max(0, fuel - keysHeld * delta);
    }
    if (driveSignatureOnRef.current) {
      power = Math.max(0, power - 2 * delta);
    }

    // Collision detection: ship sphere (SHIP_RADIUS) vs all registered collidable shapes
    groupRef.current.getWorldPosition(_shipWorldPos.current);
    for (const collidable of getCollidables()) {
      if (collidable.id === SHIP_COLLISION_ID) continue; // skip self
      collidable.getWorldPosition(_collidablePos.current);

      const shape = collidable.shape;
      let colliding = false;
      let overlap = 0;

      if (shape.type === 'sphere') {
        const dist = _shipWorldPos.current.distanceTo(_collidablePos.current);
        const minDist = SHIP_RADIUS + shape.radius;
        if (dist < minDist && dist > 0.001) {
          colliding = true;
          overlap = minDist - dist;
          _collisionNormal.current
            .subVectors(_shipWorldPos.current, _collidablePos.current)
            .normalize();
        }
      } else if (shape.type === 'box') {
        // Sphere vs OBB: transform ship into box local space, find closest point, check distance
        if (collidable.getWorldQuaternion) {
          collidable.getWorldQuaternion(_boxQuat.current);
        } else {
          _boxQuat.current.identity();
        }
        _invBoxQuat.current.copy(_boxQuat.current).invert();

        // Ship center in box local space
        _localShipPos.current
          .subVectors(_shipWorldPos.current, _collidablePos.current)
          .applyQuaternion(_invBoxQuat.current);

        // Closest point on/in box to ship center (local space)
        _closestPoint.current.set(
          THREE.MathUtils.clamp(_localShipPos.current.x, -shape.halfExtents.x, shape.halfExtents.x),
          THREE.MathUtils.clamp(_localShipPos.current.y, -shape.halfExtents.y, shape.halfExtents.y),
          THREE.MathUtils.clamp(_localShipPos.current.z, -shape.halfExtents.z, shape.halfExtents.z)
        );

        // Separation vector: ship center minus closest point (local space)
        const sepX = _localShipPos.current.x - _closestPoint.current.x;
        const sepY = _localShipPos.current.y - _closestPoint.current.y;
        const sepZ = _localShipPos.current.z - _closestPoint.current.z;
        const dist = Math.sqrt(sepX * sepX + sepY * sepY + sepZ * sepZ);

        if (dist > 0.001 && dist < SHIP_RADIUS) {
          // Ship sphere overlaps box from outside
          colliding = true;
          overlap = SHIP_RADIUS - dist;
          _collisionNormal.current
            .set(sepX / dist, sepY / dist, sepZ / dist)
            .applyQuaternion(_boxQuat.current);
        } else if (dist <= 0.001) {
          // Ship center is fully inside the box — push out along shallowest penetration axis
          const dx = shape.halfExtents.x - Math.abs(_localShipPos.current.x);
          const dy = shape.halfExtents.y - Math.abs(_localShipPos.current.y);
          const dz = shape.halfExtents.z - Math.abs(_localShipPos.current.z);
          colliding = true;
          if (dx <= dy && dx <= dz) {
            overlap = dx + SHIP_RADIUS;
            _collisionNormal.current
              .set(Math.sign(_localShipPos.current.x), 0, 0)
              .applyQuaternion(_boxQuat.current);
          } else if (dy <= dz) {
            overlap = dy + SHIP_RADIUS;
            _collisionNormal.current
              .set(0, Math.sign(_localShipPos.current.y), 0)
              .applyQuaternion(_boxQuat.current);
          } else {
            overlap = dz + SHIP_RADIUS;
            _collisionNormal.current
              .set(0, 0, Math.sign(_localShipPos.current.z))
              .applyQuaternion(_boxQuat.current);
          }
        }
      } else if (shape.type === 'capsule') {
        // Sphere vs capsule: find closest point on capsule axis segment
        if (collidable.getWorldQuaternion) {
          collidable.getWorldQuaternion(_boxQuat.current);
        } else {
          _boxQuat.current.identity();
        }
        const halfH = shape.height / 2;
        _localUp.current.set(0, 1, 0).applyQuaternion(_boxQuat.current);
        _capsuleA.current.copy(_collidablePos.current).addScaledVector(_localUp.current, -halfH);
        _capsuleB.current.copy(_collidablePos.current).addScaledVector(_localUp.current, halfH);

        const abX = _capsuleB.current.x - _capsuleA.current.x;
        const abY = _capsuleB.current.y - _capsuleA.current.y;
        const abZ = _capsuleB.current.z - _capsuleA.current.z;
        const abLenSq = abX * abX + abY * abY + abZ * abZ;
        const t =
          abLenSq > 0.0001
            ? THREE.MathUtils.clamp(
                ((_shipWorldPos.current.x - _capsuleA.current.x) * abX +
                  (_shipWorldPos.current.y - _capsuleA.current.y) * abY +
                  (_shipWorldPos.current.z - _capsuleA.current.z) * abZ) /
                  abLenSq,
                0,
                1
              )
            : 0;
        _closestPoint.current.set(
          _capsuleA.current.x + abX * t,
          _capsuleA.current.y + abY * t,
          _capsuleA.current.z + abZ * t
        );

        const minDist = SHIP_RADIUS + shape.radius;
        const dist = _shipWorldPos.current.distanceTo(_closestPoint.current);
        if (dist < minDist && dist > 0.001) {
          colliding = true;
          overlap = minDist - dist;
          _collisionNormal.current
            .subVectors(_shipWorldPos.current, _closestPoint.current)
            .normalize();
        }
      }

      if (colliding) {
        // Velocity component directed into the obstacle (negative = moving toward it)
        const impactSpeed = velocity.current.dot(_collisionNormal.current);

        // Impulse damage proportional to impact speed — no delta so 500 m/s = instant kill
        if (impactSpeed < 0) {
          damageHull(Math.abs(impactSpeed) * DAMAGE_MULTIPLIER);
        }

        // Separation: push ship out of overlap
        groupRef.current.position.addScaledVector(_collisionNormal.current, overlap);

        // Velocity response: cancel and partially reflect the into-surface component
        if (impactSpeed < 0) {
          velocity.current.addScaledVector(
            _collisionNormal.current,
            -impactSpeed * (1 + RESTITUTION)
          );
        }
      }
    }

    // Destruction: hide ship, stop physics, and fire event when hull is gone
    if (hullIntegrity <= 0) {
      shipDestroyed.current = true;
      groupRef.current.visible = false;
      velocity.current.set(0, 0, 0);
      angularVelocity.current = 0;
      window.dispatchEvent(new CustomEvent('ShipDestroyed'));
      return;
    }

    // Docking port check: dock only when the nose port enters a docking bay
    if (!dockedTo.current && dockingPortRef.current) {
      dockingPortRef.current.getWorldPosition(_portWorldPos.current);
      const bayEntry = getCollidables().find((c) => {
        if (c.id === SHIP_COLLISION_ID) return false;
        if (c.shape.type !== 'box') return false;
        if (!c.id.startsWith('docking-bay')) return false;
        c.getWorldPosition(_collidablePos.current);
        if (c.getWorldQuaternion) {
          c.getWorldQuaternion(_boxQuat.current);
        } else {
          _boxQuat.current.identity();
        }
        _invBoxQuat.current.copy(_boxQuat.current).invert();
        _localShipPos.current
          .subVectors(_portWorldPos.current, _collidablePos.current)
          .applyQuaternion(_invBoxQuat.current);
        const he = c.shape.halfExtents;
        const px =
          _localShipPos.current.x - THREE.MathUtils.clamp(_localShipPos.current.x, -he.x, he.x);
        const py =
          _localShipPos.current.y - THREE.MathUtils.clamp(_localShipPos.current.y, -he.y, he.y);
        const pz =
          _localShipPos.current.z - THREE.MathUtils.clamp(_localShipPos.current.z, -he.z, he.z);
        return Math.sqrt(px * px + py * py + pz * pz) < DOCKING_PORT_RADIUS;
      });
      if (bayEntry && velocity.current.length() < 4) {
        dockedTo.current = bayEntry.id;
        window.dispatchEvent(new CustomEvent('ShipDocked', { detail: { stationId: bayEntry.stationId ?? null } }));
        velocity.current.set(0, 0, 0);
        angularVelocity.current = 0;
        // Snap rotation and position — same math as the per-frame docked update,
        // so the port is already at bay center before the first docked frame runs.
        bayEntry.getWorldPosition(_collidablePos.current);
        if (bayEntry.getWorldQuaternion) {
          bayEntry.getWorldQuaternion(_boxQuat.current);
        } else {
          _boxQuat.current.identity();
        }
        groupRef.current.quaternion.copy(_boxQuat.current);
        _localForward.current.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_boxQuat.current);
        groupRef.current.position.copy(_collidablePos.current).sub(_localForward.current);
      }
    }

    // Lock ship to Y=0 plane — cancel any vertical drift from collisions or thrust
    velocity.current.y = 0;
    groupRef.current.position.y = 0;

    o2 = Math.max(0, o2 - 1 * delta);

    if (positionRef) {
      positionRef.current.copy(groupRef.current.position);
    }
    minimapShipPosition.copy(groupRef.current.position);
  });

  return (
    <>
      <group ref={setGroupRef} rotation={[0, 0, 0]}>
        <primitive object={gltf.scene} scale={scale} />
        {/* Docking port at ship nose — local -Z = world forward due to Math.PI rotation */}
        <group ref={dockingPortRef} position={[0, 0, DOCKING_PORT_LOCAL_Z]}>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={0.4}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
      <group position={[0, 0, 9]}>
        <DockingReleaseParticles shipGroupRef={groupRef} triggerRef={releaseParticleTrigger} />
      </group>
      <ThrusterParticles
        shipGroupRef={groupRef}
        thrustForward={thrustForward}
        thrustReverse={thrustReverse}
        thrustLeft={thrustLeft}
        thrustRight={thrustRight}
        thrustStrafeLeft={thrustStrafeLeft}
        thrustStrafeRight={thrustStrafeRight}
      />
    </>
  );
}
