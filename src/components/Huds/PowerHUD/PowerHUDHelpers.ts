export type WarnLevel = 'orange' | 'red' | null;

export function levelToColor(level: WarnLevel): string {
  if (level === 'red') return 'rgba(255, 40, 140, 0.85)';
  if (level === 'orange') return '#ffaa00';
  return 'rgba(0,200,255,1)';
}

export function resourceLevel(val: number): WarnLevel {
  if (val <= 20) return 'red';
  if (val <= 50) return 'orange';
  return null;
}

export function gforceLevel(val: number): WarnLevel {
  if (val >= 6) return 'red';
  if (val >= 3) return 'orange';
  return null;
}

export function velocityLevel(val: number): WarnLevel {
  if (val > 300) return 'red';
  if (val > 150) return 'orange';
  return null;
}
