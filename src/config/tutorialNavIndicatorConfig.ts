import { MAIN_ENGINE_LOCAL_POS_A, MAIN_ENGINE_LOCAL_POS_B, RCS_THRUSTER_LOCAL } from './shipConfig';

/** Y offset for nav-view indicator geometry (ship-local, top-down). */
export const NAV_INDICATOR_LOCAL_Y = 8;

export type NavThrusterMarkerId =
  | 'forward'
  | 'yaw-left'
  | 'yaw-right'
  | 'strafe-left'
  | 'strafe-right'
  | 'main-a'
  | 'main-b';

export interface NavThrusterMarkerDef {
  id: NavThrusterMarkerId;
  /** Ship-local XZ placement (Y uses {@link NAV_INDICATOR_LOCAL_Y}). */
  position: readonly [number, number, number];
}

/** Thruster dots around the nav heading triangle (matches RCS / main engine layout). */
export const NAV_THRUSTER_MARKER_DEFS: readonly NavThrusterMarkerDef[] = [
  {
    id: 'forward',
    position: [
      RCS_THRUSTER_LOCAL.forward[0],
      NAV_INDICATOR_LOCAL_Y,
      RCS_THRUSTER_LOCAL.forward[2] * 1.3,
    ],
  },
  { id: 'yaw-left', position: RCS_THRUSTER_LOCAL.left },
  { id: 'yaw-right', position: RCS_THRUSTER_LOCAL.right },
  { id: 'strafe-left', position: RCS_THRUSTER_LOCAL.strafeLeft },
  { id: 'strafe-right', position: RCS_THRUSTER_LOCAL.strafeRight },
  {
    id: 'main-a',
    position: [
      MAIN_ENGINE_LOCAL_POS_A[0] * 2.3,
      NAV_INDICATOR_LOCAL_Y,
      MAIN_ENGINE_LOCAL_POS_A[2] * 2.3,
    ],
  },
  {
    id: 'main-b',
    position: [
      MAIN_ENGINE_LOCAL_POS_B[0] * 2.3,
      NAV_INDICATOR_LOCAL_Y,
      MAIN_ENGINE_LOCAL_POS_B[2] * 2.3,
    ],
  },
] as const;
