import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import { SalvageConfigData } from '../SalvageConfig/SalvageConfigFile';

type Vec3 = [number, number, number];

const CAMERA_POSITION: Vec3 = [0, 100, 120];
const CAMERA_TARGET: Vec3 = [0, 0, 0];

/** Fixed orbit elevation (radians from +Y). Derived from the authored camera pose. */
function orbitPolarAngle(position: Vec3, target: Vec3): number {
  const dx = position[0] - target[0];
  const dy = position[1] - target[1];
  const dz = position[2] - target[2];
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-6) return Math.PI / 2;
  return Math.acos(Math.min(1, Math.max(-1, dy / dist)));
}

/**
 * Drone training pocket — reuses salvage field authoring (mineables, berth, etc.)
 * with a tighter camera and cooler lighting for the drone workflow.
 */
export const DroneConfigData = {
  cameraPosition: CAMERA_POSITION,
  cameraTarget: CAMERA_TARGET,
  /** Lock OrbitControls to this elevation; azimuth + zoom + XZ pan stay free. */
  cameraPolarAngle: orbitPolarAngle(CAMERA_POSITION, CAMERA_TARGET),
  gridSize: SalvageConfigData.gridSize,
  gridDivisions: SalvageConfigData.gridDivisions,
  playerShipUrl: SalvageConfigData.playerShipUrl,
  scene: {
    fogColor: '#040810',
    canvasNear: CANVAS_NEAR,
    canvasFar: CANVAS_FAR,
    toneMappingExposure: TONE_MAPPING_EXPOSURE,
    ambientIntensity: 0.18,
    keyLight: {
      position: [160, 120, 90] as Vec3,
      intensity: 2.1,
      color: '#9ec8ff',
    },
    fillLight: {
      position: [-90, 50, -70] as Vec3,
      intensity: 1.6,
      color: '#4a7aaa',
    },
  },
};
