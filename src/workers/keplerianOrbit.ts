import type {
  GravityBodySnapshot,
  TrajectorySimConfig,
  TrajectorySimResult,
} from './trajectoryTypes';

const TWO_PI = 2 * Math.PI;

/**
 * Analytical Keplerian trajectory solver for single-body (SOI) coasting arcs.
 *
 * Computes orbital elements from the body-relative state vectors, then samples
 * the conic section directly — no numerical integration. Returns the same
 * TrajectorySimResult that the numerical integrator produces, so consumers
 * (VelocityIndicator, HoverTrajectoryIndicator, minimap) need zero changes.
 *
 * All math is 2D in the XZ plane (Y = up, unused).
 */
export function keplerianTrajectory(
  simX: number,
  simZ: number,
  simVx: number,
  simVz: number,
  primary: GravityBodySnapshot,
  config: TrajectorySimConfig,
): TrajectorySimResult {
  const { steps, trackApsides } = config;
  const mu = primary.mu;

  // ── State-vector magnitudes ───────────────────────────────────────────────
  const r = Math.sqrt(simX * simX + simZ * simZ);
  const v2 = simVx * simVx + simVz * simVz;
  const rv_dot = simX * simVx + simZ * simVz; // r · v (radial velocity)

  // Specific angular momentum (scalar, Y-component of r × v in 2D)
  const h = simX * simVz - simZ * simVx;
  const h2 = h * h;

  // Specific orbital energy
  const energy = 0.5 * v2 - mu / Math.max(r, 1e-12);

  // Semi-latus rectum
  const p = h2 / mu;

  // ── Eccentricity vector (2D) ──────────────────────────────────────────────
  // e_vec = (1/μ)·((v² - μ/r)·r - (r·v)·v)
  const coeff = v2 - mu / Math.max(r, 1e-12);
  let ex = (coeff * simX - rv_dot * simVx) / mu;
  let ez = (coeff * simZ - rv_dot * simVz) / mu;
  let e = Math.sqrt(ex * ex + ez * ez);

  // ── Argument of periapsis and initial true anomaly ────────────────────────
  let omega: number; // argument of periapsis
  let nu0: number; // true anomaly at current position

  if (e < 1e-8) {
    // Near-circular: periapsis direction is undefined — use current position
    omega = 0;
    nu0 = Math.atan2(simZ, simX);
    e = 0; // clamp to exactly zero for clean sampling
  } else {
    omega = Math.atan2(ez, ex);

    // True anomaly from the state vectors
    const cos_nu = (p / Math.max(r, 1e-12) - 1) / e;
    // sin(ν) = (r·v) · h / (μ · e · r)  — sign from angular momentum direction
    const sin_nu = (rv_dot * h) / (mu * e * Math.max(r, 1e-12));
    nu0 = Math.atan2(sin_nu, cos_nu);
  }

  // ── Output buffer ─────────────────────────────────────────────────────────
  const positions = new Float32Array(steps * 2);
  let activeSteps = steps;
  let orbitClosedAt = -1;

  // Exact apsides
  let periDist = p / (1 + e);
  let apoDist = e < 1 ? p / (1 - e) : -1;
  let periStep = -1;
  let apoStep = -1;

  // ── Surface collision check ───────────────────────────────────────────────
  let nuEnd: number;
  let hitSurface = false;

  const isElliptical = energy < 0 && e < 1;

  if (isElliptical) {
    nuEnd = nu0 + TWO_PI;
  } else {
    // Hyperbolic / parabolic: asymptote limit
    const nuMax = e >= 1 ? Math.acos(Math.max(-1 / e, -1)) : Math.PI;
    nuEnd = nuMax - 0.01; // margin to avoid infinite r
  }

  if (periDist < primary.surfaceRadius && e > 1e-8) {
    // Orbit intersects surface — find impact true anomaly
    const cos_nu_impact = (p / primary.surfaceRadius - 1) / e;
    if (Math.abs(cos_nu_impact) <= 1) {
      const nuImpact = Math.acos(cos_nu_impact);
      // Impact happens at +nuImpact or -nuImpact depending on trajectory direction
      // If ship is approaching periapsis (nu0 > 0 toward 2π, or nu0 < 0),
      // the impact on the inbound leg occurs at -nuImpact (or equivalently 2π - nuImpact).
      // We need the impact angle that's ahead of nu0 in the direction of travel.
      // Direction of travel: h > 0 → counter-clockwise (ν increasing), h < 0 → clockwise.
      // We sample from nu0 forward, so just find the first impact angle > nu0.
      let nuImpactForward: number;
      if (isElliptical) {
        // For elliptical, check both +nuImpact and -nuImpact (mod 2π)
        // Normalize to [nu0, nu0 + 2π)
        const candidates = [nuImpact, -nuImpact, nuImpact + TWO_PI, -nuImpact + TWO_PI];
        nuImpactForward = nuEnd; // fallback
        for (const c of candidates) {
          const delta = c - nu0;
          const wrapped = ((delta % TWO_PI) + TWO_PI) % TWO_PI;
          if (wrapped > 0.001 && nu0 + wrapped < nuImpactForward) {
            nuImpactForward = nu0 + wrapped;
          }
        }
      } else {
        // Hyperbolic: impact at the first crossing ahead
        nuImpactForward = nuImpact; // periapsis is at ν = 0
        if (nuImpactForward <= nu0 + 0.001) {
          nuImpactForward = nuEnd; // no impact ahead
        }
      }

      if (nuImpactForward < nuEnd) {
        nuEnd = nuImpactForward;
        hitSurface = true;
      }
    }
  }

  // ── Sample the conic ──────────────────────────────────────────────────────
  const nuSpan = nuEnd - nu0;
  const nuStep = nuSpan / Math.max(steps - 1, 1);

  // Track closest samples to ν = 0 (periapsis) and ν = π (apoapsis)
  let bestPeriDelta = Infinity;
  let bestApoDelta = Infinity;

  for (let i = 0; i < steps; i++) {
    const nu = nu0 + i * nuStep;
    const cosNu = Math.cos(nu);
    const denom = 1 + e * cosNu;

    // Skip degenerate points (shouldn't happen with margin, but safety)
    if (denom <= 1e-12) {
      // Copy previous point
      if (i > 0) {
        positions[i * 2] = positions[(i - 1) * 2];
        positions[i * 2 + 1] = positions[(i - 1) * 2 + 1];
      }
      continue;
    }

    const rSample = p / denom;
    const angle = nu + omega;
    const worldX = rSample * Math.cos(angle) + primary.posX;
    const worldZ = rSample * Math.sin(angle) + primary.posZ;
    positions[i * 2] = worldX;
    positions[i * 2 + 1] = worldZ;

    // Apsis step tracking
    if (trackApsides) {
      // Periapsis: closest sample to ν ≡ 0 (mod 2π)
      const nuMod = ((nu % TWO_PI) + TWO_PI) % TWO_PI;
      const periDelta = Math.min(nuMod, TWO_PI - nuMod);
      if (periDelta < bestPeriDelta) {
        bestPeriDelta = periDelta;
        periStep = i;
      }

      // Apoapsis: closest sample to ν ≡ π (mod 2π), only for elliptical
      if (isElliptical) {
        const apoDelta = Math.abs(nuMod - Math.PI);
        if (apoDelta < bestApoDelta) {
          bestApoDelta = apoDelta;
          apoStep = i;
        }
      }
    }
  }

  // ── Handle surface collision fill ─────────────────────────────────────────
  if (hitSurface) {
    // The last sampled point is the impact point — fill remainder
    const lastIdx = steps - 1;
    const hitX = positions[lastIdx * 2];
    const hitZ = positions[lastIdx * 2 + 1];
    // All points are already filled up to steps; activeSteps = steps.
    // But we should indicate that the trajectory terminates.
    // The numerical integrator sets activeSteps to the impact index;
    // here the entire array is the truncated arc, so activeSteps = steps.
    activeSteps = steps;
    // Snap the last point to exact surface position for visual cleanliness
    positions[lastIdx * 2] = hitX;
    positions[lastIdx * 2 + 1] = hitZ;
  }

  // ── Orbit closure ─────────────────────────────────────────────────────────
  if (isElliptical && !hitSurface) {
    orbitClosedAt = steps - 1;
    // Snap the last point to the first for a clean visual closure
    positions[(steps - 1) * 2] = positions[0];
    positions[(steps - 1) * 2 + 1] = positions[1];
  }

  // ── Apsis distances (exact analytical) ────────────────────────────────────
  if (!trackApsides) {
    periDist = Infinity;
    apoDist = -Infinity;
    periStep = -1;
    apoStep = -1;
  }

  return {
    positions,
    activeSteps,
    periStep,
    apoStep,
    periDist,
    apoDist: isElliptical ? apoDist : -Infinity,
    orbitClosedAt,
    primaryBodyId: primary.id,
  };
}
