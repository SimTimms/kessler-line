/** Max particles in the vent burst pool (fuel / O₂). */
export const VENT_PARTICLE_POOL_SIZE = 300;

/** Particles spawned per vented resource unit (clamped by min/max burst). */
export const VENT_PARTICLES_PER_UNIT = 4;
export const VENT_PARTICLE_BURST_MIN = 20;
export const VENT_PARTICLE_BURST_MAX = 240;

/** World units per second (jittered per particle). */
export const VENT_PARTICLE_BASE_SPEED = 4.5;
/** Seconds until a particle fades out (jittered ±30%). */
export const VENT_PARTICLE_BASE_LIFETIME = 1.4;

/** RGB multipliers for additive point color (fuel = amber, O₂ = pale cyan). */
export const VENT_PARTICLE_COLOR_FUEL: [number, number, number] = [1.0, 0.62, 0.12];
export const VENT_PARTICLE_COLOR_O2: [number, number, number] = [0.55, 0.88, 1.0];
