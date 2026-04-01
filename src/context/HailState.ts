export type HailStatus = 'none' | 'pending' | 'accepted' | 'rejected';

const _states = new Map<string, HailStatus>();

export function getHailStatus(shipId: string): HailStatus {
  return _states.get(shipId) ?? 'none';
}

export function setHailStatus(shipId: string, status: HailStatus): void {
  _states.set(shipId, status);
  window.dispatchEvent(new CustomEvent('HailStateUpdated', { detail: { shipId, status } }));
}
