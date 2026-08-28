/** Radius of the direction-indicator circle around the ship (world units). */
export const SHIP_DIRECTION_RING_RADIUS = 48;
/**
 * Ship speed (m/s) at which the velocity ring sits at {@link SHIP_DIRECTION_RING_RADIUS}.
 * Faster/slower motion scales the arc logarithmically around this reference.
 */
export const SHIP_DIRECTION_VELOCITY_ARC_REF_SPEED = 0.9;
/** Minimum velocity-ring scale vs {@link SHIP_DIRECTION_RING_RADIUS}. */
export const SHIP_DIRECTION_VELOCITY_ARC_SCALE_MIN = 0.25;
/** Maximum velocity-ring scale vs {@link SHIP_DIRECTION_RING_RADIUS}. */
export const SHIP_DIRECTION_VELOCITY_ARC_SCALE_MAX = 6;
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
/** Nav / selected-target indicator color. */
export const SHIP_DIRECTION_TARGET_COLOR = '#ffffff';
/** Magnetic selected-target arrow color. */
export const SHIP_DIRECTION_MAGNETIC_COLOR = '#ffaa00';
/** Velocity indicator color. */
export const SHIP_DIRECTION_VELOCITY_COLOR = '#ffffff';
/** Ideal circular-orbit direction / required-velocity cue. */
export const SHIP_DIRECTION_ORBIT_COLOR = '#30ff7a';
/** Velocity arrow scale relative to the target arrow. */
export const SHIP_DIRECTION_VELOCITY_ARROW_SCALE = 0.5;
/** Target split-line: length of each segment (local Z, pre-scale). */
export const SHIP_DIRECTION_TARGET_LINE_LENGTH = 3;
/** Target split-line: gap between the two segments (local Z, pre-scale). */
export const SHIP_DIRECTION_TARGET_LINE_GAP = 3;
/** Target split-line: cross-section thickness. */
export const SHIP_DIRECTION_TARGET_LINE_THICKNESS = 0.4;
/** Velocity line: length (local Z, pre-scale). Fits inside the target gap. */
export const SHIP_DIRECTION_VELOCITY_LINE_LENGTH = 2;
/** Velocity line: cross-section thickness. */
export const SHIP_DIRECTION_VELOCITY_LINE_THICKNESS = 0.4;
/** Hide velocity arrow below this speed (m/s). */
export const SHIP_DIRECTION_MIN_SPEED = 0.05;
/** Minimap predicted-trajectory sample count (gravity curve). */
export const MINIMAP_TRAJECTORY_STEPS = 160;
/** Minimap trajectory integration timestep (seconds). */
export const MINIMAP_TRAJECTORY_DT = 0.9;
