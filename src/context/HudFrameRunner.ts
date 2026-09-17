/**
 * Shared HUD frame runner — one requestAnimationFrame loop for every HUD readout.
 */

/** @param dtMs wall-clock ms since this subscriber last ran. */
type FrameCallback = (dtMs: number) => void;

interface Subscriber {
  cb: FrameCallback;
  intervalMs: number;
  last: number;
}

/** HUD text readouts — fast enough to feel live, 4x cheaper than 60Hz. */
/* lower interval for better performance */
export const HUD_HZ = 15;
/** Scanner-style sweeps that want to look smooth but aren't per-frame critical. */
/* lower interval for better performance */
export const SCANNER_HZ = 20;
/** Opt out of throttling: run every animation frame. */
export const EVERY_FRAME = 0;

const subscribers = new Map<FrameCallback, Subscriber>();
/** Reused so iterating the subscriber list allocates nothing per tick. */
let scratch: Subscriber[] = [];
let rafId = 0;

function tick(now: number) {
  rafId = requestAnimationFrame(tick);

  // Snapshot into a reused array: a callback may register or unregister mid-tick.
  scratch.length = 0;
  for (const s of subscribers.values()) scratch.push(s);

  for (let i = 0; i < scratch.length; i++) {
    const s = scratch[i];
    // Dropped by an earlier callback in this same tick.
    if (!subscribers.has(s.cb)) continue;
    const elapsed = now - s.last;
    if (elapsed < s.intervalMs) continue;
    s.last = now;
    s.cb(elapsed);
  }
}

export function registerFrameUpdate(cb: FrameCallback, hz: number = HUD_HZ): void {
  subscribers.set(cb, {
    cb,
    intervalMs: hz > 0 ? 1000 / hz : 0,

    last: 0,
  });
  if (subscribers.size === 1 && !rafId) rafId = requestAnimationFrame(tick);
}

export function unregisterFrameUpdate(cb: FrameCallback): void {
  subscribers.delete(cb);
  if (subscribers.size === 0 && rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    scratch = [];
  }
}

/** Subscriber count — for debug overlays and tests. */
export function frameSubscriberCount(): number {
  return subscribers.size;
}
