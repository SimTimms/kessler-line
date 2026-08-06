import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import {
  DOCKING_PORT_LOCAL_Z,
  HOVER_THRUSTER_LOCAL,
  MAIN_ENGINE_LOCAL_POS_A,
  MAIN_ENGINE_LOCAL_POS_B,
  RCS_THRUSTER_LOCAL,
  SHIP_BOX_HALF_EXTENTS,
} from '../../config/shipConfig';

type Vec3 = [number, number, number];

const targetLabel = 'CONFIG TARGET';

/**
 * Authoring config for ModelConfigScene (spaceship GLB tuning).
 * Gameplay physics/collision values live in `src/config/shipConfig.ts` — referenced here
 * so the config scene stays aligned with the live player ship.
 */
export const SpaceshipConfig = {
  cameraPosition: [0, 120, 260] as Vec3,
  cameraTarget: [0, 0, 0] as Vec3,
  followCameraOffset: [-40, 50, 50] as Vec3,
  gridSize: 1200,
  gridDivisions: 24,

  /** Same GLB as Sandbox and Landing Pad Config scenes. */
  url: '/shuttle-low-british.glb',
  scale: 1,
  /** Applied to the loaded GLB primitive inside Spaceship. */
  modelRotation: [0, Math.PI / 2, 0] as Vec3,
  initialPosition: [0, 0, 0] as Vec3,
  initialRotation: [0, 0, 0] as Vec3,
  initialVelocity: [0, 0, 0] as Vec3,

  collisionId: 'model-config-spaceship',
  boxHalfExtents: SHIP_BOX_HALF_EXTENTS,

  dockingPortPosition: [0, -0.025, DOCKING_PORT_LOCAL_Z - 0.1] as Vec3,

  mainEngineA: MAIN_ENGINE_LOCAL_POS_A,
  mainEngineB: MAIN_ENGINE_LOCAL_POS_B,
  rcsForward: RCS_THRUSTER_LOCAL.forward,
  rcsLeft: RCS_THRUSTER_LOCAL.left,
  rcsRight: RCS_THRUSTER_LOCAL.right,
  rcsStrafeLeft: RCS_THRUSTER_LOCAL.strafeLeft,
  rcsStrafeRight: RCS_THRUSTER_LOCAL.strafeRight,
  rcsForwardLight: RCS_THRUSTER_LOCAL.forwardLight,
  rcsLeftLight: RCS_THRUSTER_LOCAL.leftLight,
  rcsRightLight: RCS_THRUSTER_LOCAL.rightLight,
  rcsStrafeLeftLight: RCS_THRUSTER_LOCAL.strafeLeftLight,
  rcsStrafeRightLight: RCS_THRUSTER_LOCAL.strafeRightLight,
  hoverThrusters: HOVER_THRUSTER_LOCAL,

  thrusterHitboxDebugOffset: [0, -2, 0] as Vec3,
  dockingReleaseParticlesOffset: [0, 0, 9] as Vec3,

  shadowLight: {
    position: [0, 500, 100] as Vec3,
    target: [0, 0, 0] as Vec3,
    angle: Math.PI / 5,
    penumbra: 0.4,
    intensity: 50000,
    distance: 1000,
    shadowMapSize: 2048,
    shadowRadius: 8,
    shadowCameraNear: 1,
    shadowCameraFar: 400,
  },

  targetLabel,
  targetPosition: [0, 0, 0] as Vec3,
  targetScan: {
    id: 'model-config-spaceship',
    label: targetLabel,
    magnetic: true,
    driveSignature: true,
    proximity: false,
    physicalCollision: true,
  } as const,

  shipParticleCloudProps: {
    count: 100,
    enableSpeedGate: true,
    speedGateMin: 100000,
    speedGateMax: 100000,
  },

  physicsOptions: {
    enabled: true,
    inputEnabled: true,
    thrusterPhysicsEnabled: true,
    orbitalPhysicsEnabled: true,
    dockingPhysicsEnabled: true,
  },

  scene: {
    fogColor: '#000000',
    canvasNear: CANVAS_NEAR,
    canvasFar: CANVAS_FAR,
    toneMappingExposure: TONE_MAPPING_EXPOSURE,
  },

  dustCloud: {
    radius: 500,
    particleSize: 10000,
    radialSpread: 2,
    yInitial: -100,
  },
};
