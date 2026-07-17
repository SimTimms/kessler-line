export const navHudEnabledRef = { current: true };

export const EVENT_NAV_HUD_ENABLED_CHANGED = 'NavHudEnabledChanged';

/** Open the NavHUD scan-contact picker for a specific scanner (magnet, drive, …). */
export const EVENT_OPEN_SCAN_PICKER = 'OpenScanPicker';

export function setNavHudEnabled(enabled: boolean): void {
  navHudEnabledRef.current = enabled;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAV_HUD_ENABLED_CHANGED, { detail: { enabled } }),
  );
}

export function requestOpenScanPicker(scanId: string): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_OPEN_SCAN_PICKER, { detail: { scanId } }),
  );
}
