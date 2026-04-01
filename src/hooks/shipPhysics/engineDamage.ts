import * as THREE from 'three';
import {
  THRUST,
  shipDestroyed,
  mainEngineDisabled,
  MAIN_ENGINE_LOCAL_POS,
  thrustMultiplier,
} from '../../context/ShipState';
import { ENGINE_TORQUE_SCALE } from '../../config/shipConfig';

const _engineOffset = new THREE.Vector3();
const _engineForce = new THREE.Vector3();
const _engineTorque = new THREE.Vector3();
const _engineForward = new THREE.Vector3();

export function getActiveMainEngines(): number {
  return shipDestroyed.current
    ? 0
    : (mainEngineDisabled.reverseA.current ? 0 : 1) +
        (mainEngineDisabled.reverseB.current ? 0 : 1);
}

export function applyEngineAsymmetryTorque({
  rev,
  activeMainEngines,
  group,
  angularVelocity,
  cappedDelta,
}: {
  rev: boolean;
  activeMainEngines: number;
  group: THREE.Group;
  angularVelocity: React.MutableRefObject<number>;
  cappedDelta: number;
}): void {
  if (rev && activeMainEngines === 1) {
    const engineLocal = mainEngineDisabled.reverseA.current
      ? MAIN_ENGINE_LOCAL_POS.reverseB
      : MAIN_ENGINE_LOCAL_POS.reverseA;
    _engineOffset.copy(engineLocal).applyQuaternion(group.quaternion);
    _engineForward.set(0, 0, 1).applyQuaternion(group.quaternion);
    const perEngineForce = THRUST * thrustMultiplier.current * 0.5;
    _engineForce.copy(_engineForward).multiplyScalar(perEngineForce);
    _engineTorque.crossVectors(_engineOffset, _engineForce);
    angularVelocity.current += _engineTorque.y * ENGINE_TORQUE_SCALE * cappedDelta;
  }
}
