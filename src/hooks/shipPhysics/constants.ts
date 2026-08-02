export const PHYSICS_MAX_DELTA = 1 / 30;
// 1/60 gives one sub-step at 60 fps and two at worst case (30 fps).
// 1/120 was causing 3–4 sub-steps at typical frame rates, multiplying
// gravity/collision work and creating a feedback loop that dropped FPS further.
export const PHYSICS_MAX_STEP = 1 / 60;
export const DELTA_SPIKE_THRESHOLD = 1 / 20;
