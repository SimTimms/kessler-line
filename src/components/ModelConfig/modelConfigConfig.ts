import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';

export const MODEL_CONFIG_CAMERA_POSITION: [number, number, number] = [0, 120, 260];
export const MODEL_CONFIG_CAMERA_TARGET: [number, number, number] = [0, 0, 0];
export const MODEL_CONFIG_GRID_SIZE = 1200;
export const MODEL_CONFIG_GRID_DIVISIONS = 24;

export const MODEL_CONFIG_TARGET_LABEL = 'CONFIG TARGET';
export const MODEL_CONFIG_TARGET_SCALE = 3;
export const MODEL_CONFIG_TARGET_POSITION: [number, number, number] = [0, 0, 0];
export const MODEL_CONFIG_TARGET_SCAN = {
  id: 'model-config-target',
  label: MODEL_CONFIG_TARGET_LABEL,
  magnetic: true,
  driveSignature: true,
  proximity: false,
} as const;

export const MODEL_CONFIG_SCENE = {
  fogColor: '#000000',
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
};
