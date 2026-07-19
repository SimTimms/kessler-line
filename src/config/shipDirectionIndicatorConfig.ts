/** Radius of the direction-indicator circle around the ship (world units). */
export const SHIP_DIRECTION_RING_RADIUS = 48;
/** Cone tip radius for circumference arrows. */
export const SHIP_DIRECTION_ARROW_TIP_RADIUS = 2.6;
/** Cone height for circumference arrows. */
export const SHIP_DIRECTION_ARROW_TIP_LENGTH = 8;
/** Shaft length behind the tip. */
export const SHIP_DIRECTION_ARROW_SHAFT_LENGTH = 5;
/** Shaft cross-section. */
export const SHIP_DIRECTION_ARROW_SHAFT_WIDTH = 1.15;
/** Guide ring line opacity. */
export const SHIP_DIRECTION_RING_OPACITY = 0.005;
/** Nav / selected-target arrow color. */
export const SHIP_DIRECTION_TARGET_COLOR = '#9fdfff';
/** Magnetic selected-target arrow color. */
export const SHIP_DIRECTION_MAGNETIC_COLOR = '#ffaa00';
/** Velocity arrow color (matches speed readout). */
export const SHIP_DIRECTION_VELOCITY_COLOR = '#ff8800';
/** Velocity arrow scale relative to the target arrow. */
export const SHIP_DIRECTION_VELOCITY_ARROW_SCALE = 0.5;
/** Hide velocity arrow below this speed (m/s). */
export const SHIP_DIRECTION_MIN_SPEED = 0.05;
/** Minimap predicted-trajectory sample count (gravity curve). */
export const MINIMAP_TRAJECTORY_STEPS = 160;
/** Minimap trajectory integration timestep (seconds). */
export const MINIMAP_TRAJECTORY_DT = 0.9;
