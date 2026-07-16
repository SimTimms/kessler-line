import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';

type Vec3 = [number, number, number];

const targetLabel = 'CONFIG TARGET';

export const LandingPadConfig = {
  cameraPosition: [0, 120, 260] as Vec3,
  cameraTarget: [0, 0, 0] as Vec3,
  followCameraOffset: [-40, 50, 50] as Vec3,
  gridSize: 1200,
  gridDivisions: 24,
  playerShipUrl: '/shuttle-low.glb',
  playerShipScale: 1,
  landingPadOffsetFromSpawn: [0, -20, -76] as Vec3,
  landingPadScale: 10,
  landingPadThreshold: 28,
  targetLabel,
  targetScale: 30,
  targetPosition: [0, -10, 0] as Vec3,
  targetScan: {
    id: 'landing-pad-config-target',
    label: targetLabel,
    magnetic: true,
    driveSignature: true,
    proximity: false,
    physicalCollision: true,
  } as const,
  /** Approximate main engine nozzle in UBoat body-local space (scale 3). */
  mainThrusterPosition: [0, -100.15, -2.6] as Vec3,
  mainThrusterScale: 1,
  forwardRcsPosition: [0, 0, 2.8] as Vec3,
  forwardRcsScale: 1,
  yawLeftRcsPosition: [1.4, 0, 1.2] as Vec3,
  yawLeftRcsScale: 1,
  yawRightRcsPosition: [-1.4, 0, 1.2] as Vec3,
  yawRightRcsScale: 1,
  scene: {
    fogColor: '#000000',
    canvasNear: CANVAS_NEAR,
    canvasFar: CANVAS_FAR,
    toneMappingExposure: TONE_MAPPING_EXPOSURE,
  },
  dustCloud: {
    radius: 5000,
    particleSize: 600,
    radialSpread: 9,
    yInitial: -1000,
  },
};
