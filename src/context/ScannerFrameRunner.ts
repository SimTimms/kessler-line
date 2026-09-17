import { registerFrameUpdate, SCANNER_HZ, unregisterFrameUpdate } from './HudFrameRunner';

type FrameCallback = () => void;

/**
 * Scanner HUD frame hooks — now a thin adapter over {@link HudFrameRunner}.
 *
 * Kept under its original name because several scanner HUDs register through it.
 * The previous implementation owned an rAF loop and throttled by frame count
 * (`frameCount % 3`), which is ~20Hz on a 60Hz display but ~40Hz on a 120Hz one.
 * The shared runner throttles by wall clock, so SCANNER_HZ holds on any display.
 */
export function registerScannerUpdate(cb: FrameCallback): void {
  registerFrameUpdate(cb, SCANNER_HZ);
}

export function unregisterScannerUpdate(cb: FrameCallback): void {
  unregisterFrameUpdate(cb);
}
