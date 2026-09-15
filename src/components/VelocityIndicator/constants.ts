import type { TrajectorySimConfig } from '../../maths/trajectoryTypes';

// ── Screen labels (HTML overlays that follow the arrows) ──────────────────
/** Local +Z offset past the arrow tip — label projects from this anchor. */
export const SPEED_LABEL_LOCAL_Z = 22;
export const ORBIT_REQ_LABEL_LOCAL_Z = 22;
/** Pixels to push each screen label below its anchor. */
export const SCREEN_LABEL_OFFSET_Y_PX = 40;

export const SPEED_LABEL_STYLE =
  'font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;pointer-events:none;color:#ff8800;text-shadow:0 0 8px rgba(255,136,0,0.55);opacity:0.92;';
export const ORBIT_REQ_LABEL_STYLE =
  'font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;pointer-events:none;opacity:0.92;color:#999;text-shadow:0 0 6px rgba(153,153,153,0.4);';

// ── Trajectory request (worker) ───────────────────────────────────────────
export const TRAJ_STEPS = 400;
/** Seconds per step. Only the numeric fallback uses this; the Kepler path ignores it. */
export const TRAJ_DT = 0.9;

export const SHIP_TRAJECTORY_CONFIG: TrajectorySimConfig = {
  steps: TRAJ_STEPS,
  dt: TRAJ_DT,
  detectOrbitClosure: true,
  trackApsides: true,
  adaptiveDt: true,
};

// ── Pe / Ap markers ───────────────────────────────────────────────────────
export const APSIS_COLOR = '#00e5ff';
/** Target on-screen height for Pe/Ap sprites (px). World scale is derived from camera each frame. */
export const APSIS_MARKER_SCREEN_PX = 20;
/** Sprite width as a multiple of its height. */
export const APSIS_MARKER_ASPECT = 3.2;
/** Sprite height (world units) when the camera is not a PerspectiveCamera. */
export const APSIS_MARKER_FALLBACK_HEIGHT = 10;
export const APSIS_CANVAS_WIDTH = 256;
export const APSIS_CANVAS_HEIGHT = 80;

// ── Orbit guide (dashed ideal-orbit circle + "CIRCULAR ORBIT" label) ──────
export const ORBIT_GUIDE_POINTS = 400;
export const ORBIT_GUIDE_COLOR = '#30ff7a';
export const ORBIT_GUIDE_OPACITY = 0.22;
export const ORBIT_GUIDE_DASH_SIZE = 3;
export const ORBIT_GUIDE_GAP_SIZE = 2;
/** The ideal orbit radius is capped at this fraction of the body's sphere of influence. */
export const IDEAL_ORBIT_MAX_SOI_FRACTION = 0.9;
export const ORBIT_LABEL_CANVAS_WIDTH = 256;
export const ORBIT_LABEL_CANVAS_HEIGHT = 64;
export const ORBIT_LABEL_SPRITE_WIDTH = 32;
export const ORBIT_LABEL_SPRITE_HEIGHT = 10;

// ── Orbit direction arrow ─────────────────────────────────────────────────
export const ORBIT_DIR_RING_OPACITY = 0.005;
