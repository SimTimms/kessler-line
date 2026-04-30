export const navHudEnabledRef = { current: true };

export function setNavHudEnabled(enabled: boolean): void {
  navHudEnabledRef.current = enabled;
}
