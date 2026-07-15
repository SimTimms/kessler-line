import { playPadScanSound, stopPadScanSound } from '../sound/SoundManager';

/** Pad / dock inbound scan of the player ship (docking-assist range). */

export const EVENT_PAD_SCAN_STARTED = 'PadScanStarted';
export const EVENT_PAD_SCAN_ENDED = 'PadScanEnded';

export const padScanActiveRef = { current: false };
export const padScanDockIdRef: { current: string | null } = { current: null };

let scanGeneration = 0;

export function setPadScanActive(active: boolean, dockId: string | null = null): void {
  padScanActiveRef.current = active;
  padScanDockIdRef.current = active ? dockId : null;
  window.dispatchEvent(
    new CustomEvent(active ? EVENT_PAD_SCAN_STARTED : EVENT_PAD_SCAN_ENDED, {
      detail: { dockId: padScanDockIdRef.current },
    })
  );
}

/**
 * Begin an inbound pad scan of the player ship.
 * Plays the corrupt-data SFX and keeps scan HUD active until it finishes.
 */
export function beginPadScan(dockId: string): void {
  const gen = ++scanGeneration;
  setPadScanActive(true, dockId);
  void playPadScanSound().then(() => {
    if (gen !== scanGeneration) return;
    setPadScanActive(false);
  });
}

export function cancelPadScan(): void {
  scanGeneration += 1;
  stopPadScanSound();
  if (padScanActiveRef.current) {
    setPadScanActive(false);
  }
}
