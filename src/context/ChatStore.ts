// Module-level chat thread store (same pattern as MessageStore).
// One ChatThread per ship ID; threads persist for the session.

export interface ChatMessage {
  id: string;
  role: 'player' | 'npc';
  text: string;
  timestamp: number;
  /** Resolved src of a recorded voice clip, played on demand from the panel. */
  audioSrc?: string;
}

export interface ChatThread {
  shipId: string;
  shipName: string;
  captainName: string;
  dialogueTreeId: string;
  messages: ChatMessage[];
  /** Which dialogue turn is currently active (null = conversation ended). */
  currentTurnId: string | null;
  /** True while we're waiting for the NPC response to arrive. */
  awaitingNpc: boolean;
}

const _threads = new Map<string, ChatThread>();

function emit(shipId: string): void {
  window.dispatchEvent(new CustomEvent('ChatUpdated', { detail: { shipId } }));
}

export function getThread(shipId: string): ChatThread | undefined {
  return _threads.get(shipId);
}

export function createThread(
  shipId: string,
  shipName: string,
  captainName: string,
  dialogueTreeId: string,
  openingTurnId: string,
): ChatThread {
  const thread: ChatThread = {
    shipId,
    shipName,
    captainName,
    dialogueTreeId,
    messages: [],
    currentTurnId: openingTurnId,
    awaitingNpc: true, // always waiting for the opening NPC message
  };
  _threads.set(shipId, thread);
  emit(shipId);
  return thread;
}

export function addChatMessage(shipId: string, msg: ChatMessage): void {
  const thread = _threads.get(shipId);
  if (!thread) return;
  thread.messages = [...thread.messages, msg];
  emit(shipId);
}

/** Update the active turn and awaiting flag after a player choice or NPC delivery. */
export function setChatTurn(
  shipId: string,
  turnId: string | null,
  awaitingNpc: boolean,
): void {
  const thread = _threads.get(shipId);
  if (!thread) return;
  thread.currentTurnId = turnId;
  thread.awaitingNpc = awaitingNpc;
  emit(shipId);
}

/** Snapshot all threads for save serialisation. */
export function getAllThreads(): Map<string, ChatThread> {
  return _threads;
}

/** Replace all threads from a saved snapshot. */
export function restoreThreads(saved: Record<string, ChatThread>): void {
  _threads.clear();
  for (const [id, thread] of Object.entries(saved)) {
    _threads.set(id, { ...thread, messages: thread.messages.map((m) => ({ ...m })) });
  }
  window.dispatchEvent(new CustomEvent('ChatUpdated', { detail: { shipId: '__restore__' } }));
}
