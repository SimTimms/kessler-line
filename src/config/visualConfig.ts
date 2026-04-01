// ── Camera controls ──────────────────────────────────────────────────────
/** Mouse drag sensitivity for camera orbit (radians per pixel). */
export const CAMERA_MOUSE_SENSITIVITY = 0.005;
/** Mouse wheel sensitivity for camera zoom (radius scale per scroll unit). */
export const CAMERA_WHEEL_SENSITIVITY = 0.001;
/** Minimum camera orbit radius (world units). */
export const CAMERA_ZOOM_MIN = 2;
/** Maximum camera orbit radius (world units). */
export const CAMERA_ZOOM_MAX = 10500;
/** Maximum shake amplitude when over-thrusting. */
export const CAMERA_SHAKE_AMP_MAX = 1.0;
/** Frequencies (Hz) composited to produce the thrust camera shake. */
export const CAMERA_SHAKE_FREQUENCIES = [23.7, 11.3, 17.9, 8.1] as const;

// ── Scene rendering ──────────────────────────────────────────────────────
/** Exponential fog color (hex). */
export const FOG_COLOR = 0x000000;
/** Exponential fog density. Lower = thinner fog. */
export const FOG_DENSITY = 0.00004;
/** R3F Canvas camera near clip plane. */
export const CANVAS_NEAR = 0.01;
/** R3F Canvas camera far clip plane. */
export const CANVAS_FAR = 100_000_000;
/** ACESFilmic tone mapping exposure. */
export const TONE_MAPPING_EXPOSURE = 0.9;
