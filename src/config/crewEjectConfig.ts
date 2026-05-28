/** Max simultaneous ejected crew models in the scene. */
export const CREW_EJECT_MAX = 24;

/** Seconds before an ejected crew model is removed. */
export const CREW_EJECT_LIFETIME = 90;

/** World scale applied to `person.glb` when ejected. */
export const CREW_EJECT_MODEL_SCALE = 1.4;

/** Base ejection speed (m/s) along down-and-outward from the ship underside. */
export const CREW_EJECT_SPEED = 2.5;

/** Random spread (m/s) added to the ejection velocity. */
export const CREW_EJECT_SPREAD = 1.2;

/** Tumble speed range (rad/s). */
export const CREW_EJECT_TUMBLE_MIN = 0.8;
export const CREW_EJECT_TUMBLE_MAX = 2.8;
