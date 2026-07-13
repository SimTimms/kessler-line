import { useEffect, useId, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  registerThruster,
  unregisterThruster,
  type ThrusterKind,
} from '../../context/ThrusterRegistry';
import { useVesselPhysicsContext } from './VesselPhysics';
import ThrusterExhaust from './ThrusterExhaust';

export type { ThrusterKind };

export interface ThrusterProps {
  /** Defaults to the parent VesselPhysics vessel id. */
  vesselId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** KeyboardEvent.code binding; null for NPC/scripted thrusters via `activeRef`. */
  keyCode?: string | null;
  /** When `keyCode` is null, this ref drives firing state. */
  activeRef?: React.MutableRefObject<boolean>;
  /** Multiplier on base fuel burn while firing. */
  fuelConsumptionMultiplier?: number;
  /** Multiplier on thrust acceleration. */
  thrustMultiplier?: number;
  kind?: ThrusterKind;
  /** Apply yaw torque instead of linear thrust. */
  yaw?: boolean;
  /** Yaw torque sign when `yaw` is true. */
  yawSign?: 1 | -1;
  /**
   * Local direction the parent vessel is pushed (normalized each frame).
   * Exhaust particles emit in the opposite direction.
   */
  thrustDirection?: [number, number, number];
  showParticles?: boolean;
  showLight?: boolean;
}

/**
 * Self-contained thruster mount: position in the scene, bind a key (or null),
 * and apply thrust + fuel drain through the parent vessel physics body.
 */
export default function Thruster({
  vesselId: vesselIdProp,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  keyCode = null,
  activeRef,
  fuelConsumptionMultiplier = 1,
  thrustMultiplier = 1,
  kind = 'main',
  yaw = false,
  yawSign = 1,
  thrustDirection = [0, 0, 1],
  showParticles = true,
  showLight = true,
}: ThrusterProps) {
  const reactId = useId();
  const thrusterId = `thruster-${reactId}`;
  const groupRef = useRef<THREE.Group>(null);
  const vesselCtx = useVesselPhysicsContext();
  const vesselId = vesselIdProp ?? vesselCtx?.vesselId;

  const thrustDir = useMemo(
    () => new THREE.Vector3(...thrustDirection).normalize(),
    [thrustDirection[0], thrustDirection[1], thrustDirection[2]]
  );
  const exhaustDir = useMemo(() => thrustDir.clone().negate(), [thrustDir]);

  useEffect(() => {
    if (!vesselId) {
      console.warn('Thruster requires vesselId prop or a parent VesselPhysics provider.');
      return;
    }

    registerThruster({
      id: thrusterId,
      vesselId,
      objectRef: groupRef,
      keyCode,
      activeRef,
      fuelConsumptionMultiplier,
      thrustMultiplier,
      kind,
      yaw,
      yawSign,
      thrustDirection: thrustDir,
      firing: false,
    });

    return () => {
      unregisterThruster(thrusterId);
    };
  }, [
    activeRef,
    fuelConsumptionMultiplier,
    keyCode,
    kind,
    thrustDir,
    thrustMultiplier,
    thrusterId,
    vesselId,
    yaw,
    yawSign,
  ]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <ThrusterExhaust
        thrusterId={thrusterId}
        kind={kind}
        exhaustDirection={exhaustDir}
        showParticles={showParticles}
        showLight={showLight}
      />
    </group>
  );
}
