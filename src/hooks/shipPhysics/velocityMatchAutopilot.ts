import * as THREE from 'three';
import { VEL_MATCH_DEAD } from '../../config/velocityMatchConfig';
import {
  autopilotThrustForward,
  autopilotThrustReverse,
  autopilotThrustStrafeLeft,
  autopilotThrustStrafeRight,
  autopilotRadialOut,
  autopilotRadialIn,
} from '../../context/AutopilotState';
import { gravityBodies } from '../../context/GravityRegistry';
import { selectedTargetName, selectedTargetVelocity } from '../../context/TargetSelection';
import {
  tutorialDaedalusWorldVelocity,
  velocityMatchUsesTutorialDaedalusVel,
} from '../../context/VelocityMatch';

const _localForward = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _radialDir = new THREE.Vector3();
const _shipPos = new THREE.Vector3();
const _targetVel = new THREE.Vector3();
const _error = new THREE.Vector3();

export function updateVelocityMatchThrustOutputs(
  group: THREE.Group,
  shipVelocity: THREE.Vector3,
  opts: { primaryGravityId: { current: string | null } },
): void {
  if (velocityMatchUsesTutorialDaedalusVel.current) {
    _targetVel.copy(tutorialDaedalusWorldVelocity.current);
  } else if (selectedTargetName !== null && selectedTargetVelocity.lengthSq() > 1e-10) {
    _targetVel.copy(selectedTargetVelocity);
  } else {
    return;
  }

  _error.subVectors(_targetVel, shipVelocity);
  const dead = VEL_MATCH_DEAD;

  _localForward.set(0, 0, 1).applyQuaternion(group.quaternion);
  _localRight.set(1, 0, 0).applyQuaternion(group.quaternion);

  // `fwd` / `rev` in step.ts: fwd adds along -_localForward, rev along +_localForward.
  const eF = _error.dot(_localForward);
  if (eF > dead) autopilotThrustReverse.current = true;
  else if (eF < -dead) autopilotThrustForward.current = true;

  const eR = _error.dot(_localRight);
  if (eR > dead) autopilotThrustStrafeRight.current = true;
  else if (eR < -dead) autopilotThrustStrafeLeft.current = true;

  const gid = opts.primaryGravityId.current;
  if (gid) {
    const body = gravityBodies.get(gid);
    if (body) {
      group.getWorldPosition(_shipPos);
      _radialDir.subVectors(_shipPos, body.position);
      if (_radialDir.lengthSq() < 1e-10) return;
      _radialDir.normalize();
      const eRad = _error.dot(_radialDir);
      if (eRad > dead) autopilotRadialOut.current = true;
      else if (eRad < -dead) autopilotRadialIn.current = true;
    }
  }
}
