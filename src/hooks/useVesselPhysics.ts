import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FUEL_BURN_RATE } from '../config/damageConfig';
import {
  THRUSTER_MAIN_FORCE,
  THRUSTER_RCS_FORCE,
  THRUSTER_RCS_FUEL_FACTOR,
  THRUSTER_YAW_FORCE,
} from '../config/thrusterConfig';
import {
  canVesselPropulsion,
  drainVesselFuel,
  ensureVesselInventory,
} from '../context/VesselInventory';
import {
  getThrustersForVessel,
  isThrusterActive,
  type RegisteredThruster,
  type ThrusterKind,
} from '../context/ThrusterRegistry';

const _thrustDir = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();

function thrustForceForKind(kind: ThrusterKind, thrustMultiplier: number): number {
  const base = kind === 'main' ? THRUSTER_MAIN_FORCE : THRUSTER_RCS_FORCE;
  return base * thrustMultiplier;
}

function fuelBurnForThruster(entry: RegisteredThruster, dt: number): number {
  const rcsFactor = entry.kind === 'rcs' ? THRUSTER_RCS_FUEL_FACTOR : 1;
  return FUEL_BURN_RATE * entry.fuelConsumptionMultiplier * rcsFactor * dt;
}

interface UseVesselPhysicsParams {
  vesselId: string;
  rootRef: RefObject<THREE.Group | null>;
  initialFuel?: number;
  enabled?: boolean;
}

export function useVesselPhysics({
  vesselId,
  rootRef,
  initialFuel = 100,
  enabled = true,
}: UseVesselPhysicsParams): void {
  const velocity = useRef(new THREE.Vector3());
  const angularVelocity = useRef(0);
  const didInit = useRef(false);

  useFrame((_, delta) => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    ensureVesselInventory(vesselId, initialFuel);
    if (!didInit.current) {
      didInit.current = true;
    }

    const canThrust = canVesselPropulsion(vesselId);
    const entries = getThrustersForVessel(vesselId);

    for (const entry of entries) {
      const active = isThrusterActive(entry);
      entry.firing = active && canThrust;
      if (!entry.firing) continue;

      if (entry.yaw) {
        angularVelocity.current +=
          entry.yawSign * THRUSTER_YAW_FORCE * entry.thrustMultiplier * delta;
      } else {
        const obj = entry.objectRef.current;
        if (!obj) continue;
        obj.getWorldQuaternion(_worldQuat);
        _thrustDir.copy(entry.thrustDirection).applyQuaternion(_worldQuat).normalize();
        const force = thrustForceForKind(entry.kind, entry.thrustMultiplier);
        velocity.current.addScaledVector(_thrustDir, force * delta);
      }

      drainVesselFuel(vesselId, fuelBurnForThruster(entry, delta));
    }

    if (angularVelocity.current !== 0) {
      root.rotation.y += angularVelocity.current * delta;
    }

    root.position.addScaledVector(velocity.current, delta);
    velocity.current.y = 0;
    root.position.y = 0;
  });
}
