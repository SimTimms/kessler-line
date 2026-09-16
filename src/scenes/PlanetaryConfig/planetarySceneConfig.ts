import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import { getPlanetPosition } from '../../config/planetPosition';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';

type Vec3 = [number, number, number];

/** World-space position near Mars orbit, offset above the plane for a good overview. */
function computeInitialCameraPosition(): Vec3 {
  const mars = getPlanetPosition('Mars');
  // Place camera between Sun and Mars, elevated above the orbital plane
  return [mars.x * 0.8, mars.y + 800_000, mars.z * 0.8];
}

export const PLANETARY_CONFIG = {
  fogColor: '#000000',
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  solarSystemScale: SOLAR_SYSTEM_SCALE,
  cameraPosition: computeInitialCameraPosition(),
} as const;
