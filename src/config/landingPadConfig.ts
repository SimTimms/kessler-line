/**
 * Hover-dock elevator for the LandPad mesh inside landing-pad.glb.
 * During auto-dock the platform rises to the ship, then descends with it.
 *
 * Scale rules:
 * - LandPad keeps its GLB local Y at rest; the model root is offset so rest
 *   world-Y stays at the authoring height for every `scale`.
 * - Meet offset is authored per unit scale and multiplied by `scale` at runtime.
 */

/**
 * World-Y meet offset at scale=1 (added to ship Y before converting to LandPad local).
 * Multiplied by LandingPad `scale` at runtime. 0 = platform origin matches ship origin.
 */
export const LANDING_PAD_PLATFORM_MEET_OFFSET_Y = -7.6;

/** World units/s the LandPad platform moves on Y to meet and follow the ship. */
export const LANDING_PAD_PLATFORM_MOVE_SPEED = 2.8;

/** Consider the platform "at ship height" within this world-Y tolerance. */
export const LANDING_PAD_PLATFORM_MEET_EPSILON = 0.08;

/** GLB node name for the rising platform mesh. */
export const LANDING_PAD_PLATFORM_OBJECT_NAME = 'LandPad';

/**
 * Ship-to-pad distance within which the DockingBay is mounted.
 * Beyond this the bay is unmounted, removing it from the per-frame docking scan.
 * Also mounted when this pad is the active nav target.
 */
export const LANDING_PAD_DOCKING_BAY_ACTIVATION_RANGE = 80;
