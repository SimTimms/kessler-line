import { resetScannerRefs } from './resetScannerRefs';

/** Fired when player ship power crosses from >0 to 0. */
export const EVENT_SHIP_POWER_DEPLETED = 'ShipPowerDepleted';

/** Fired when player ship power crosses from 0 to >0. */
export const EVENT_SHIP_POWER_RESTORED = 'ShipPowerRestored';

let systemsForcedOffline = false;

/** True after a depletion event until power is restored. */
export function areShipSystemsForcedOffline(): boolean {
  return systemsForcedOffline;
}

/**
 * Kill powered ship systems (scanners, spotlight, radio) at the ref level.
 * UI listeners sync their React state from {@link EVENT_SHIP_POWER_DEPLETED}.
 */
export function forceShipSystemsOffline(): void {
  if (systemsForcedOffline) {
    // Still clear refs in case something toggled them back on while powerless.
    resetScannerRefs();
    return;
  }
  systemsForcedOffline = true;
  resetScannerRefs();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_SHIP_POWER_DEPLETED));
  }
}

export function notifyShipPowerRestored(): void {
  if (!systemsForcedOffline) return;
  systemsForcedOffline = false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_SHIP_POWER_RESTORED));
  }
}

/**
 * Call whenever player power is written. Handles the 0-crossing edge.
 * @returns the clamped power value
 */
export function onPlayerPowerChanged(previous: number, next: number): number {
  const clamped = Math.max(0, next);
  if (previous > 0 && clamped <= 0) {
    forceShipSystemsOffline();
  } else if (previous <= 0 && clamped > 0) {
    notifyShipPowerRestored();
  }
  return clamped;
}
