// Autopilot operational constants

// Arrival thresholds
export const STATION_ARRIVAL_RADIUS = 300;
export const PLANET_ARRIVAL_RADIUS  = 1500; // target hold-distance from planet center

// Speed thresholds
export const RETROBURN_DONE_SPEED        = 5;   // m/s — below this, station velocity is "killed"
export const PLANET_RETRO_ARRIVAL_SPEED  = 20;  // m/s — target speed when arriving at planet radius
export const MAX_RETROBURN_ANGLE = 0.5;  // rad — max misalignment before braking

// Alignment thresholds for the yaw controller
export const ALIGN_ANGLE_THRESHOLD = 0.02;   // rad
export const ALIGN_ANG_VEL_THRESHOLD = 0.02; // rad/s

// Thrust scaling — distance bands
export const THRUST_DIST_FAR  = 10000; // beyond this → full haul thrust
export const THRUST_DIST_MID  = 2000;
export const THRUST_DIST_NEAR = 500;
export const THRUST_FAR       = 10;
export const THRUST_MID       = 4;
export const THRUST_NEAR      = 2;
export const THRUST_PRECISION = 1; // retroburn / circularize / final approach

// Orbit insertion: target periapsis for the initial insertion ellipse
export const ORBIT_INSERTION_PERIAPSIS = 1000;

