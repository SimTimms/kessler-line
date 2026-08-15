import type { ScannerRangeId } from '../config/scanRanges';

/**
 * Log types:
 * - 'msg'   — comms, hails, NPC chatter
 * - 'alert' — system warnings, proximity events
 * - Scanner types mirror ScannerRangeId so the tag shows PRX / MAG / DRV / RAD / RDN
 */
export type EventLogType = 'msg' | 'alert' | ScannerRangeId;

/** Display labels for the tag chip (matches SCANNER_ABBREV for scanner types). */
export const EVENT_LOG_TAG_LABEL: Record<EventLogType, string> = {
  msg: 'MSG',
  alert: 'ALT',
  proximity: 'PRX',
  magnet: 'MAG',
  drive: 'DRV',
  radio: 'RAD',
  radiation: 'RDN',
};

/** Which types can open the scan picker when clicked. */
const SCANNER_TYPES = new Set<string>(['proximity', 'magnet', 'drive', 'radio', 'radiation']);

export function isClickableScannerType(type: EventLogType): type is ScannerRangeId {
  return SCANNER_TYPES.has(type);
}

export interface EventLogEntry {
  id: number;
  type: EventLogType;
  text: string;
  createdAt: number;
}

/** Total entries retained in memory. */
const MAX_ENTRIES = 2000;
/** How many the HUD shows at once (most recent). */
export const VISIBLE_ENTRIES = 50;

const listeners = new Set<() => void>();

let nextId = 1;
let entries: EventLogEntry[] = [];

function notify() {
  for (const listener of listeners) listener();
}

export function getEventLog(): readonly EventLogEntry[] {
  return entries;
}

/**
 * Push a new entry into the event log.
 * Callable from any component, hook, or module — no React context needed.
 *
 * @param type  — 'msg' | 'alert' | 'proximity' | 'magnet' | 'drive' | 'radio' | 'radiation'
 * @param text  — human-readable log line
 */
export function pushEventLog(type: EventLogType, text: string): void {
  entries = [
    { id: nextId++, type, text, createdAt: performance.now() },
    ...entries,
  ].slice(0, MAX_ENTRIES);
  notify();
}

/** Delete a single entry by id (purge individual log). */
export function deleteEventLogEntry(id: number): void {
  const before = entries.length;
  entries = entries.filter((e) => e.id !== id);
  if (entries.length !== before) notify();
}

/** Purge all log entries. */
export function clearEventLog(): void {
  if (entries.length === 0) return;
  entries = [];
  notify();
}

export function subscribeEventLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
