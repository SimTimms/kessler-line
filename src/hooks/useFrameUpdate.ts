import { useEffect, useRef } from 'react';
import { HUD_HZ, registerFrameUpdate, unregisterFrameUpdate } from '../context/HudFrameRunner';

interface FrameUpdateOptions {
  /** Ticks per second. Pass `EVERY_FRAME` to run unthrottled. Defaults to `HUD_HZ`. */
  hz?: number;
  /** When false the subscription is dropped — for HUDs that only run while open. */
  enabled?: boolean;
}

/**
 * Subscribe a component to the shared HUD frame loop (see {@link HudFrameRunner}).
 *
 * Replaces the per-component `requestAnimationFrame` / `cancelAnimationFrame`
 * pair. Because every subscriber runs inside one callback, React 19 batches all
 * of their state updates into a single commit per tick instead of one each.
 *
 * `cb` may be a fresh closure every render without resubscribing; only `hz` or
 * `enabled` changing re-registers.
 */
export function useFrameUpdate(
  cb: (dtMs: number) => void,
  { hz = HUD_HZ, enabled = true }: FrameUpdateOptions = {}
): void {
  const cbRef = useRef(cb);

  // Keep the latest closure without resubscribing. Assigning in an effect rather
  // than during render satisfies react-hooks/refs; a tick can therefore see the
  // previous render's closure for at most one frame, which is harmless for a
  // readout that reads live refs anyway.
  useEffect(() => {
    cbRef.current = cb;
  });

  useEffect(() => {
    if (!enabled) return;
    const run = (dtMs: number) => cbRef.current(dtMs);
    registerFrameUpdate(run, hz);
    return () => unregisterFrameUpdate(run);
  }, [hz, enabled]);
}
