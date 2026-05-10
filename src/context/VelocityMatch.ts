import * as THREE from 'three';

/** Tutorial general scene: Daedalus cluster world-space velocity (station orbit). */
export const tutorialDaedalusWorldVelocity = { current: new THREE.Vector3() };

/** When true, velocity-match autopilot uses `tutorialDaedalusWorldVelocity` instead of scan target velocity. */
export const velocityMatchUsesTutorialDaedalusVel = { current: false };
