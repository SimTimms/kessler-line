import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';
import {
  COMBAT_CONFIG,
  COMBAT_DUST_COLORS,
  getCombatShipSpawn,
} from '../CombatConfig/combatSceneConfig';

type Vec3 = [number, number, number];

/** Prefix collidable / drive-signature ids so this scene does not collide with Combat Config. */
export const HUD_ID_PREFIX = 'hud-';

export const HUD_DUST_COLORS = COMBAT_DUST_COLORS;

export function getHudShipSpawn(): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  return getCombatShipSpawn();
}

/**
 * Combat pocket + salvage docks for HUD authoring.
 * Main camera matches Combat Config (TutorialFollowCamera); cockpit GLB is camera-fixed.
 */
export const HUD_CONFIG = {
  ...COMBAT_CONFIG,
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  /**
   * Shuttle cockpit interior locked to the follow camera.
   * Tweak localPosition / localRotation / scale until the canopy frames correctly.
   */
  cameraCockpit: {
    url: '/shuttle-low-british-cockpit.glb',
    localPosition: [0, -1.1, -1] as Vec3,
    localRotation: [0, Math.PI * 0.5, 0] as Vec3,
    scale: 1,
  },
  /**
   * World origin for the Salvage Config berth / bay / container pocket.
   * Local salvage coords (berth at +X ≈ 300) are applied relative to this.
   */
  salvageFieldOrigin: [0, 0, 0] as Vec3,
  dustCloud: {
    ...COMBAT_CONFIG.dustCloud,
    colors: HUD_DUST_COLORS,
  },
};
