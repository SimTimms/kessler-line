/** Short trajectory preview shown when hovering a world object. */
export const HOVER_TRAJ_STEPS = 250; // 50 base × 5 length scale ≈ 225 s preview
export const HOVER_TRAJ_DT = 0.9;
export const HOVER_TRAJ_MIN_SPEED = 0.001;
export const HOVER_TRAJ_COLOR = 0x00c8ff;
export const HOVER_TRAJ_OPACITY = 0.38;
export const HOVER_TRAJ_DASH_SIZE = 4;
export const HOVER_TRAJ_GAP_SIZE = 2.5;

// ── Simulation throttle intervals ─────────────────────────────────────────
// Each trajectory indicator runs its gravity simulation every N frames rather
// than every frame. At 60 fps, interval=3 → ~20 Hz updates, which is
// imperceptible for slowly-evolving orbital curves.
/** VelocityIndicator trajectory simulation cadence (frames). */
export const TRAJ_UPDATE_INTERVAL = 3;
/** HoverTrajectoryIndicator simulation cadence (frames). Resets on target change. */
export const HOVER_TRAJ_UPDATE_INTERVAL = 3;

// ── Orbit closure detection ──────────────────────────────────────────────
/** Integration steps before orbit-closure check begins. */
export const ORBIT_MIN_STEPS = 25;
/** World-unit distance to declare orbit closed (trajectory returned to start). */
export const ORBIT_CLOSE_DIST = 150;
/**
 * Trajectory must travel at least this far from start before closure is checked.
 * Prevents approach arcs that curve near the start from being mistaken for orbits.
 */
export const ORBIT_AWAY_DIST = 500;
