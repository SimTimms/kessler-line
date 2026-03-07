import { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ThrusterParticles from './ThrusterParticles';
import DockingBay from './DockingBay';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';
import { registerDriveSignature, unregisterDriveSignature } from '../context/DriveSignatureRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { shipVelocity } from './Spaceship';

const AI_THRUST = 2.2;
const DOCKING_PORT_LOCAL_Z = 9; // matches player ship nose offset
const AI_DOCKING_BAY_DIMS = new THREE.Vector3(10, 1, 10); // matches origin docking bay size
const YAW_P = 3.0;   // proportional gain — how hard it steers toward target
const YAW_D = 4.5;   // derivative gain — damping to prevent oscillation
const PROXIMITY_RANGE = 1000;   // units — trigger range
const CLOSING_SPEED = 35;       // m/s target closing speed during intercept
const VELOCITY_MATCHED = 5;          // m/s relative — consider "matched"
const HAIL_COOLDOWN = 45;       // seconds before re-triggering after cooldown

type AIState = 'idle' | 'hailing' | 'intercepting' | 'matching' | 'cooldown';

interface AIShipProps {
  id: string;
  url: string;
  position: [number, number, number];
  scale?: number;
}

// Module-level temp vectors — avoid per-frame allocation
const _aiPos = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _toPlayerDir = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _desiredVel = new THREE.Vector3();
const _velError = new THREE.Vector3();
const _thrustDir = new THREE.Vector3();
const _localFwd = new THREE.Vector3();
const _noseDir = new THREE.Vector3();

export default function AIShip({ id, url, position, scale = 1 }: AIShipProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  // Clone the scene so this ship gets its own independent Three.js object tree.
  // useGLTF caches the result, so without cloning both ships share the same
  // THREE.Group — and mounting it in two places moves it, making one invisible.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null!);

  const aiVel = useRef(new THREE.Vector3());
  const angVel = useRef(0);
  const state = useRef<AIState>('idle');
  const cooldownTimer = useRef(0);
  const hasReacted = useRef(false); // true while player is in range and has been reacted to
  const playerIsDocked = useRef(false); // true while player is docked to this ship's bay

  // Thrust state refs — read by ThrusterParticles for visual effects
  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false);
  const thrustRight = useRef(false);
  const thrustStrafeLeft = useRef(false);
  const thrustStrafeRight = useRef(false);

  const collisionId = `ai-ship-${id}`;

  useEffect(() => {
    registerCollidable({
      id: collisionId,
      getWorldPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (groupRef.current) groupRef.current.getWorldQuaternion(target);
        return target;
      },
      shape: { type: 'box', halfExtents: new THREE.Vector3(9, 3, 10) },
      getObject3D: () => groupRef.current,
    });
    return () => unregisterCollidable(collisionId);
  }, [collisionId]);

  useEffect(() => {
    const sigId = `drive-sig-${id}`;
    registerDriveSignature({
      id: sigId,
      label: 'Unknown Drive',
      getPosition: (target) => {
        if (groupRef.current) groupRef.current.getWorldPosition(target);
        return target;
      },
    });
    return () => unregisterDriveSignature(sigId);
  }, [id]);

  useEffect(() => {
    const stationId = `ai-ship-${id}`;
    const onDocked = (e: Event) => {
      if ((e as CustomEvent).detail?.stationId === stationId) playerIsDocked.current = true;
    };
    const onUndocked = () => { playerIsDocked.current = false; };
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
  }, [id]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Reset visual thrust flags — set below if thrusting this frame
    thrustForward.current = false;
    thrustReverse.current = false;

    groupRef.current.getWorldPosition(_aiPos);
    _toPlayer.subVectors(minimapShipPosition, _aiPos);
    const dist = _toPlayer.length();

    switch (state.current) {
      case 'idle': {
        if (dist < PROXIMITY_RANGE) {
          if (!hasReacted.current) {
            hasReacted.current = true;
            const roll = Math.random();
            if (roll < 0.4) {
              // Hail the player
              const type = roll < 0.2 ? 'trade' : 'mission';
              state.current = 'hailing';
              cooldownTimer.current = 0;
              window.dispatchEvent(
                new CustomEvent('NPCHail', { detail: { shipId: id, type } })
              );
            } else {
              // Intercept
              state.current = 'intercepting';
            }
          }
        } else {
          // Player left range — reset so we can react again next time
          hasReacted.current = false;
        }
        break;
      }

      case 'hailing': {
        // Drift while hailing; dialog handled in App.tsx
        cooldownTimer.current += delta;
        if (cooldownTimer.current > 8) {
          state.current = 'cooldown';
          cooldownTimer.current = 0;
        }
        break;
      }

      case 'intercepting': {
        if (dist > 10) {
          // Desired velocity: match player velocity + close at CLOSING_SPEED
          _toPlayerDir.copy(_toPlayer).normalize();
          _desiredVel.copy(shipVelocity).addScaledVector(_toPlayerDir, CLOSING_SPEED);
          _velError.subVectors(_desiredVel, aiVel.current);
          applyThrustToward(_velError, delta);
        }

        // Transition to velocity matching once close enough
        if (dist < 10) {
          state.current = 'matching';
        }
        break;
      }

      case 'matching': {
        // Thrust to null out relative velocity
        _relVel.subVectors(aiVel.current, shipVelocity);
        const relSpeed = _relVel.length();

        if (relSpeed < VELOCITY_MATCHED) {
          // Matched — hold position and enter cooldown
          state.current = 'cooldown';
          cooldownTimer.current = 0;
        } else {
          _velError.subVectors(shipVelocity, aiVel.current);
          applyThrustToward(_velError, delta);
        }
        break;
      }

      case 'cooldown': {
        cooldownTimer.current += delta;
        if (cooldownTimer.current > HAIL_COOLDOWN) {
          state.current = 'idle';
          cooldownTimer.current = 0;
          hasReacted.current = false;
        }
        break;
      }
    }

    // While player is docked, cancel axial (nose-axis) velocity so the ship doesn't drag them
    if (playerIsDocked.current) {
      _noseDir.set(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
      const axialSpeed = aiVel.current.dot(_noseDir);
      aiVel.current.addScaledVector(_noseDir, -axialSpeed);
    }

    // Integrate yaw and position — no drag, space physics
    groupRef.current.rotation.y += angVel.current * delta;
    groupRef.current.position.addScaledVector(aiVel.current, delta);
    // Lock to Y=0 plane
    groupRef.current.position.y = 0;
    aiVel.current.y = 0;
  });

  // Yaw the ship's nose (+Z local, model is π-flipped on Y) toward the thrust direction,
  // then fire main engines (S-key style: velocity += -AI_THRUST * localFwd(-Z) = +Z).
  // Matches the player ship: S key = thrustReverse = addScaledVector(localFwd(-Z), -THRUST).
  function applyThrustToward(velError: THREE.Vector3, delta: number) {
    if (!groupRef.current || velError.lengthSq() < 0.01) return;
    _thrustDir.copy(velError).normalize();

    // PD yaw controller — target yaw to face thrustDir in XZ plane
    const tx = _thrustDir.x;
    const tz = _thrustDir.z;
    if (Math.abs(tx) + Math.abs(tz) > 0.01) {
      // targetYaw: rotation.y such that ship nose (+Z local) points toward thrustDir
      const targetYaw = Math.atan2(tx, tz);
      let yawErr = targetYaw - groupRef.current.rotation.y;
      // Normalize to [-π, π]
      while (yawErr > Math.PI) yawErr -= 2 * Math.PI;
      while (yawErr < -Math.PI) yawErr += 2 * Math.PI;
      angVel.current += (yawErr * YAW_P - angVel.current * YAW_D) * delta;
    }

    // S-key convention: localFwd = local -Z; nose = local +Z.
    // Fire when nose (+Z) is well-aligned: dot(-Z, thrustDir) < -0.85
    _localFwd.set(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
    const dot = _localFwd.dot(_thrustDir);
    if (dot < -0.85) {
      // S key: velocity += -THRUST * localFwd(-Z) → moves ship in +Z (nose-first)
      aiVel.current.addScaledVector(_localFwd, -AI_THRUST * delta);
      thrustReverse.current = true;
    }
  }

  return (
    <>
      <group ref={groupRef} position={position}>
        <primitive object={scene} scale={scale} />
        <group position={[0, 0, DOCKING_PORT_LOCAL_Z]}>
          <DockingBay
            stationId={`ai-ship-${id}`}
            dimensions={AI_DOCKING_BAY_DIMS}
          />
        </group>
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
