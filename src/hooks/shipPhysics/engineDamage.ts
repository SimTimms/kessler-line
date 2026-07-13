import * as THREE from 'three';
import { THRUST } from '../../context/ShipState';
import { ENGINE_TORQUE_SCALE } from '../../config/shipConfig';
import type { VesselRuntimeState } from '../../context/VesselStateStore';

const _engineOffset = new THREE.Vector3();
const _engineForce = new THREE.Vector3();
const _engineTorque = new THREE.Vector3();
const _engineForward = new THREE.Vector3();

export function getActiveMainEngines(vesselState: VesselRuntimeState): number {
  return vesselState.shipDestroyed.current
    ? 0
    : (vesselState.mainEngineDisabled.reverseA.current ? 0 : 1) +
        (vesselState.mainEngineDisabled.reverseB.current ? 0 : 1);
}

export function applyEngineAsymmetryTorque({
  vesselState,
  rev,
  activeMainEngines,
  group,
  angularVelocity,
  cappedDelta,
}: {
  vesselState: VesselRuntimeState;
  rev: boolean;
  activeMainEngines: number;
  group: THREE.Group;
  angularVelocity: React.MutableRefObject<number>;
  cappedDelta: number;
}): void {
  if (rev && activeMainEngines === 1) {
    const engineLocal = vesselState.mainEngineDisabled.reverseA.current
      ? vesselState.MAIN_ENGINE_LOCAL_POS.reverseB
      : vesselState.MAIN_ENGINE_LOCAL_POS.reverseA;
    _engineOffset.copy(engineLocal).applyQuaternion(group.quaternion);
    _engineForward.set(0, 0, 1).applyQuaternion(group.quaternion);
    const perEngineForce = THRUST * vesselState.thrustMultiplier.current * 0.5;
    _engineForce.copy(_engineForward).multiplyScalar(perEngineForce);
    _engineTorque.crossVectors(_engineOffset, _engineForce);
    angularVelocity.current += _engineTorque.y * ENGINE_TORQUE_SCALE * cappedDelta;
  }
}
