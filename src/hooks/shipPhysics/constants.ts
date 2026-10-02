export const PHYSICS_MAX_DELTA = 1 / 30;
// 1/50 keeps the sub-step threshold off the 60 Hz frame boundary. At exactly
// 1/60 a 60 Hz frame's delta lands on the cutoff, so sub-millisecond jitter
// flipped it between one pass and two (the second a near-zero "runt" step that
// still cost a full gravity/collision pass) — a per-frame sawtooth that read as
// stutter on 60 Hz displays but not on 120 Hz ones.
// 1/50 gives one sub-step at both 60 and 120 fps, and only starts sub-stepping
// below ~50 fps, which is what the cap was for.
// 1/120 was causing 3–4 sub-steps at typical frame rates, multiplying
// gravity/collision work and creating a feedback loop that dropped FPS further.
export const PHYSICS_MAX_STEP = 1 / 50;
export const DELTA_SPIKE_THRESHOLD = 1 / 20;
