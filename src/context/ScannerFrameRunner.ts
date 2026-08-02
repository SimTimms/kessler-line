type FrameCallback = () => void;

const callbacks = new Set<FrameCallback>();
let rafId = 0;
let frameCount = 0;

function tick() {
  rafId = requestAnimationFrame(tick);
  if (++frameCount % 3 !== 0) return; // ~20Hz at 60fps
  for (const cb of callbacks) cb();
}

export function registerScannerUpdate(cb: FrameCallback) {
  callbacks.add(cb);
  if (callbacks.size === 1) {
    frameCount = 0;
    rafId = requestAnimationFrame(tick);
  }
}

export function unregisterScannerUpdate(cb: FrameCallback) {
  callbacks.delete(cb);
  if (callbacks.size === 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}
