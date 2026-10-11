import { getAllThreads, getThread, type ChatMessage } from '../context/ChatStore';
import { parseDockThreadId, type DockContact } from '../config/dockConfig';
import { findDockContactById, getDockablePartnerLabel } from '../context/DockablePartnerStore';

export function personKeyForThread(threadId: string): string {
  return getThread(threadId)?.personId ?? parseDockThreadId(threadId)?.contactId ?? threadId;
}

export function resolvePersonContact(threadId: string): DockContact | undefined {
  return findDockContactById(personKeyForThread(threadId))?.contact;
}

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
