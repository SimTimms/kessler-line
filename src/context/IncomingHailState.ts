export interface IncomingHailEventDetail {
  id: string;
  active: boolean;
}

const _incoming = new Set<string>();

export function setIncomingHail(id: string): void {
  _incoming.add(id);
  window.dispatchEvent(
    new CustomEvent<IncomingHailEventDetail>('IncomingHailUpdated', { detail: { id, active: true } })
  );
}

export function dismissIncomingHail(id: string): void {
  if (!_incoming.has(id)) return;
  _incoming.delete(id);
  window.dispatchEvent(
    new CustomEvent<IncomingHailEventDetail>('IncomingHailUpdated', { detail: { id, active: false } })
  );
}
