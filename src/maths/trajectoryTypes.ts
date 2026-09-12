/** Flat serializable snapshot of a GravityBody (no Three.js Vector3). */
export type GravityBodySnapshot = {
  id: string;
  posX: number;
  posZ: number;
  velX: number;
  velZ: number;
  mu: number;
  soiRadius: number;
  surfaceRadius: number;
  orbitAltitude: number;
};

/** Simulation configuration sent with each request. */
export type TrajectorySimConfig = {
  steps: number;
  dt: number;
  /** Enable orbit-closure detection (used by ship + minimap, not hover). */
  detectOrbitClosure: boolean;
  /** Enable apsis (Pe/Ap) tracking. */
  trackApsides: boolean;
  /** Enable adaptive timestep for bound orbits. */
  adaptiveDt: boolean;
};

/** Result of a trajectory simulation. */
export type TrajectorySimResult = {
  /** XZ positions interleaved: [x0, z0, x1, z1, ...]. Length = steps * 2. */
  positions: Float32Array;
  /** Number of steps actually computed (may be less than config.steps on surface hit or orbit closure). */
  activeSteps: number;
  /** Index of periapsis step (-1 if not tracked or no primary). */
  periStep: number;
  /** Index of apoapsis step (-1 if not tracked or no primary). */
  apoStep: number;
  /** Periapsis radial distance from primary center. */
  periDist: number;
  /** Apoapsis radial distance from primary center. */
  apoDist: number;
  /** Step index where orbit closed back to start (-1 if open trajectory). */
  orbitClosedAt: number;
  /** ID of the primary body used for the simulation (null if free-flight). */
  primaryBodyId: string | null;
};

// ── Worker message protocol ─────────────────────────────────────────────────

export type TrajectoryRequestKind = 'ship' | 'hover' | 'minimap';

export type TrajectoryRequest = {
  type: 'trajectory-request';
  id: number;
  kind: TrajectoryRequestKind;
  /** Starting position (world-space). */
  startX: number;
  startZ: number;
  /** Starting velocity (world-space). */
  velX: number;
  velZ: number;
  /** Gravity body snapshots for this frame. */
  bodies: GravityBodySnapshot[];
  config: TrajectorySimConfig;
};

export type TrajectoryResponse = {
  type: 'trajectory-response';
  id: number;
  kind: TrajectoryRequestKind;
  result: TrajectorySimResult;
};
