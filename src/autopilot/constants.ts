// Autopilot operational constants
import { SOLAR_SYSTEM_SCALE as S } from '../config/solarConfig';

// Arrival thresholds
export const STATION_ARRIVAL_RADIUS = 300;

// Speed thresholds
export const RETROBURN_DONE_SPEED        = 5;   // m/s — below this, station velocity is "killed"
export const PLANET_RETRO_ARRIVAL_SPEED  = 20;  // m/s — target speed when arriving at planet radius
export const MAX_RETROBURN_ANGLE = 0.5;  // rad — max misalignment before braking

// Alignment thresholds for the yaw controller
export const ALIGN_ANGLE_THRESHOLD = 0.02;   // rad
export const ALIGN_ANG_VEL_THRESHOLD = 0.02; // rad/s

// Thrust scaling — distance bands (FAR/MID scale with solar system; NEAR is fixed near target)
export const THRUST_DIST_FAR  = 2500 * S; // 10_000 at scale=4
export const THRUST_DIST_MID  = 500 * S;  // 2_000 at scale=4
export const THRUST_DIST_NEAR = 500;       // fixed — close approach regardless of scale
export const THRUST_FAR       = 10;
export const THRUST_MID       = 4;
export const THRUST_NEAR      = 2;
export const THRUST_PRECISION = 1; // retroburn / circularize / final approach

// Orbit insertion: target periapsis for the initial insertion ellipse
export const ORBIT_INSERTION_PERIAPSIS = 250 * S; // 1_000 at scale=4

