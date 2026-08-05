export type HailStatus = 'none' | 'pending' | 'accepted' | 'rejected';

const _states = new Map<string, HailStatus>();
const _declinedAt = new Map<string, number>();

/** After declining, wait before showing the incoming-hail badge again. */
export const HAIL_REOFFER_COOLDOWN_MS = 30_000;

export function getHailStatus(shipId: string): HailStatus {
  return _states.get(shipId) ?? 'none';
}

export function setHailStatus(shipId: string, status: HailStatus): void {
  _states.set(shipId, status);
  window.dispatchEvent(new CustomEvent('HailStateUpdated', { detail: { shipId, status } }));
}

export function markHailDeclined(shipId: string): void {
  setHailStatus(shipId, 'rejected');
  _declinedAt.set(shipId, Date.now());
}

export function getHailDeclinedAt(shipId: string): number {
  return _declinedAt.get(shipId) ?? 0;
}

/** Whether a broadcaster can show the incoming-hail badge again after a decline. */
export function canOfferHailAgain(shipId: string): boolean {
  const status = getHailStatus(shipId);
  if (status === 'accepted') return false;
  if (status !== 'rejected') return true;
  return Date.now() - getHailDeclinedAt(shipId) > HAIL_REOFFER_COOLDOWN_MS;
}

export function clearHailState(shipId: string): void {
  _states.delete(shipId);
  _declinedAt.delete(shipId);
}

/** Snapshot all hail state for save serialisation. */
export function getAllHailStates(): { states: Record<string, HailStatus>; declinedAt: Record<string, number> } {
  return {
    states: Object.fromEntries(_states),
    declinedAt: Object.fromEntries(_declinedAt),
  };
}

/** Replace all hail state from a saved snapshot. */
export function restoreHailStates(saved: { states: Record<string, HailStatus>; declinedAt: Record<string, number> }): void {
  _states.clear();
  _declinedAt.clear();
  for (const [id, status] of Object.entries(saved.states)) {
    _states.set(id, status);
  }
  for (const [id, ts] of Object.entries(saved.declinedAt)) {
    _declinedAt.set(id, ts);
  }
}
