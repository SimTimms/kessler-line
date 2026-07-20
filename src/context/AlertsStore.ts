export type AlertLevel = 'blue' | 'yellow' | 'red';

export interface AlertMessage {
  id: number;
  text: string;
  level: AlertLevel;
  createdAt: number;
}

const MAX_ALERTS = 8;
const listeners = new Set<() => void>();

let nextId = 1;
let alerts: AlertMessage[] = [];

export function getAlerts(): readonly AlertMessage[] {
  return alerts;
}

export function pushAlert(text: string, level: AlertLevel): void {
  alerts = [{ id: nextId++, text, level, createdAt: performance.now() }, ...alerts].slice(
    0,
    MAX_ALERTS
  );
  for (const listener of listeners) listener();
}

export function clearAlerts(): void {
  if (alerts.length === 0) return;
  alerts = [];
  for (const listener of listeners) listener();
}

export function subscribeAlerts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
