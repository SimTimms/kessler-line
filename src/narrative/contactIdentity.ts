// One person, several channels.
//
// A character can be reached in more than one place — Elias Voss sits in the
// Donington Station directory (thread `salvage-berth::elias-voss`) and also
// hails the ship on the emergency broadcast (thread `elias-voss`). Both threads
// belong to the same person, so the comms panel resolves a single identity
// (portrait, role, dossier) and shows their whole conversation history.

import { getAllThreads, getThread, type ChatMessage } from '../context/ChatStore';
import { parseDockThreadId, type DockContact } from '../config/dockConfig';
import { findDockContactById, getDockablePartnerLabel } from '../context/DockablePartnerStore';

/**
 * The person behind a chat thread. A narrative hail states it outright via
 * `personId`; dock threads are `<dockId>::<contactId>`, so both collapse to the
 * dock contact id. Anything else is its own person.
 */
export function personKeyForThread(threadId: string): string {
  return getThread(threadId)?.personId ?? parseDockThreadId(threadId)?.contactId ?? threadId;
}

/** Portrait / role / dossier for a thread, when it belongs to a known contact. */
export function resolvePersonContact(threadId: string): DockContact | undefined {
  return findDockContactById(personKeyForThread(threadId))?.contact;
}

/**
 * Messages this person exchanged with the player on their *other* channels,
 * so a hail carries the station conversation (and vice versa).
 *
 * Skips anything the thread already holds — older saves copied dock history in
 * under `history-`-prefixed ids and would otherwise show it twice.
 */
export function getLinkedHistory(threadId: string): ChatMessage[] {
  const personKey = personKeyForThread(threadId);
  const threads = getAllThreads();
  const own = threads.get(threadId);
  const ownIds = new Set(own?.messages.map((m) => m.id) ?? []);

  const linked: ChatMessage[] = [];
  for (const [id, thread] of threads) {
    if (id === threadId) continue;
    if (personKeyForThread(id) !== personKey) continue;
    for (const msg of thread.messages) {
      if (ownIds.has(msg.id) || ownIds.has(`history-${msg.id}`)) continue;
      linked.push(msg);
    }
  }
  return linked;
}

/**
 * Where a thread's carried-in history was recorded, for the divider above it —
 * e.g. `EARLIER · DONINGTON STATION`. Undefined when there is nothing to label.
 */
export function getLinkedHistoryLabel(threadId: string): string | undefined {
  const personKey = personKeyForThread(threadId);
  for (const [id, thread] of getAllThreads()) {
    if (id === threadId || thread.messages.length === 0) continue;
    if (personKeyForThread(id) !== personKey) continue;
    const dockId = parseDockThreadId(id)?.dockId;
    const where = dockId ? getDockablePartnerLabel(dockId) : thread.shipName;
    return `EARLIER · ${where.toUpperCase()}`;
  }
  return undefined;
}
