/**
 * Fast / normal travel zones.
 *
 * When normal-travel pockets are registered:
 * - inside any pocket → player thrust multiplier is capped at
 *   {@link NORMAL_TRAVEL_THRUST_MULTIPLIER}
 * - outside all pockets → capped at {@link FAST_TRAVEL_THRUST_MULTIPLIER}
 *
 * Crossing into a pocket still arms staged entry braking (shed speed), but
 * zones do not continuously hard-cap velocity after that.
 *
 * With no pockets registered, the system is inactive (no zone thrust cap).
 *
 * Each pocket has an outer radius and an inner radius at half that distance
 * (used for staged entry-brake targets and ring visuals).
 */

/** Max thrust multiplier while inside a normal-travel pocket (inner or mid). */
export const NORMAL_TRAVEL_THRUST_MULTIPLIER = 3;

/** Max thrust multiplier while fully outside normal-travel pockets. */
export const FAST_TRAVEL_THRUST_MULTIPLIER = 50;

/** Hard ceiling for zone thrust caps (future tuning / ramp). */
export const FAST_TRAVEL_MAX_THRUST_MULTIPLIER = 50;

/**
 * Inner-core entry brake target (m/s) when crossing into the half-radius ring.
 * @deprecated Prefer {@link NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED}.
 */
export const NORMAL_TRAVEL_ENTRY_MAX_SPEED = 50;

/** Outer-band entry brake target (m/s) when crossing the outer normal ring. */
export const NORMAL_TRAVEL_OUTER_ENTRY_MAX_SPEED = 300;

/** Inner-core entry brake target (m/s) when crossing the inner normal ring. */
export const NORMAL_TRAVEL_INNER_ENTRY_MAX_SPEED = 50;

/**
 * Deceleration (u/s²) applied opposite velocity while shedding speed on
 * staged normal-zone entry. Sized to dump FT speeds quickly.
 */
export const NORMAL_TRAVEL_ENTRY_BRAKE_ACCEL = 25_000;

/** Above this speed (m/s): red Alerts HUD warning. */
export const FAST_TRAVEL_CREW_RISK_SPEED = 1000;

/**
 * At or above this speed (m/s): block thrust that would further increase
 * speed along the current travel direction (forward or reverse engines).
 */
export const FAST_TRAVEL_ENGINE_CUTOFF_SPEED = 12_000;

/** At or above this speed (m/s): ship is destroyed. */
export const FAST_TRAVEL_DEATH_SPEED = 15_000;

/** Default grey dashed ring styling for normal-travel boundary visuals. */
export const NORMAL_TRAVEL_RING_COLOR = 0x888888;
/** Outer normal-travel ring opacity. */
export const NORMAL_TRAVEL_OUTER_RING_OPACITY = 0.2;
/** Inner normal-travel ring opacity. */
export const NORMAL_TRAVEL_INNER_RING_OPACITY = 0.4;
/** @deprecated Use outer/inner opacities. */
export const NORMAL_TRAVEL_RING_OPACITY = NORMAL_TRAVEL_OUTER_RING_OPACITY;
export const NORMAL_TRAVEL_RING_SEGMENTS = 128;
/** Dash/gap as a fraction of ring radius. */
export const NORMAL_TRAVEL_RING_DASH_FRAC = 0.04;
export const NORMAL_TRAVEL_RING_GAP_FRAC = 0.04;
