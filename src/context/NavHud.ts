export const navHudEnabledRef = { current: true };

export const EVENT_NAV_HUD_ENABLED_CHANGED = 'NavHudEnabledChanged';

export function setNavHudEnabled(enabled: boolean): void {
  navHudEnabledRef.current = enabled;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAV_HUD_ENABLED_CHANGED, { detail: { enabled } }),
  );
}
