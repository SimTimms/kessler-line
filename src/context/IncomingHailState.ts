export interface IncomingHailEventDetail {
  id: string;
  active: boolean;
}

// ── Incoming hail SFX ─────────────────────────────────────────────────────
const INCOMING_HAIL_SFX_SRC = '/audio/ship/incoming-hail.mp3';
let _incomingHailAudio: HTMLAudioElement | null = null;

function playIncomingHailSound(): void {
  try {
    if (!_incomingHailAudio) {
      _incomingHailAudio = new Audio(INCOMING_HAIL_SFX_SRC);
      _incomingHailAudio.preload = 'auto';
    }
    _incomingHailAudio.pause();
    _incomingHailAudio.currentTime = 0;
    _incomingHailAudio.volume = 0.5;
    _incomingHailAudio.playbackRate = 1;
    _incomingHailAudio.loop = false;
    void _incomingHailAudio.play().catch(() => undefined);
  } catch {
    /* non-critical */
  }
}

const _incoming = new Set<string>();

export function hasIncomingHail(id: string): boolean {
  return _incoming.has(id);
}

/** Snapshot of currently active incoming hail ids. */
export function getIncomingHails(): string[] {
  return Array.from(_incoming);
}

export function setIncomingHail(id: string): void {
  const isNew = !_incoming.has(id);
  _incoming.add(id);
  if (isNew) playIncomingHailSound();
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

export function clearAllIncomingHails(): void {
  for (const id of _incoming) {
    window.dispatchEvent(
      new CustomEvent<IncomingHailEventDetail>('IncomingHailUpdated', { detail: { id, active: false } })
    );
  }
  _incoming.clear();
}
