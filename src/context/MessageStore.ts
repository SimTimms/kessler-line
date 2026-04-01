export type MessagePlatform = 'REACH' | 'HERALD' | 'OPENLINE' | 'MERIDIAN' | 'BROADCAST';

export interface NpcResponseTemplate {
  id: string;
  from: string;
  subject: string;
  body: string;
  platform?: MessagePlatform;
}

export interface ReplyOption {
  id: string;
  label: string;
  playerText: string;
  npcResponse?: NpcResponseTemplate;
  deliveryNote?: string;
}

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  timestamp: number;
  audioFile?: string;
  audioVoice?: string;
  platform?: MessagePlatform;
  replies?: ReplyOption[];
  repliedWith?: string;
  /** Location id (planet/station name) the message originated from — used for delay calc. */
  senderLocationId?: string;
}

interface PendingMessage {
  msg: Omit<InboxMessage, 'read' | 'timestamp'>;
  deliverAt: number; // Date.now() ms
}

const _messages: InboxMessage[] = [];
const _pending: PendingMessage[] = [];

export const messageStore: { current: InboxMessage[] } = { current: _messages };

// Check pending queue every second and deliver due messages.
setInterval(() => {
  const now = Date.now();
  let delivered = false;
  for (let i = _pending.length - 1; i >= 0; i--) {
    if (_pending[i].deliverAt <= now) {
      const { msg } = _pending.splice(i, 1)[0];
      if (!_messages.some((m) => m.id === msg.id)) {
        _messages.push({ ...msg, read: false, timestamp: Date.now() });
        delivered = true;
      }
    }
  }
  if (delivered) window.dispatchEvent(new Event('InboxUpdated'));
}, 1000);

export function addMessage(msg: Omit<InboxMessage, 'read' | 'timestamp'>) {
  if (_messages.some((m) => m.id === msg.id)) return;
  if (_pending.some((p) => p.msg.id === msg.id)) return;
  _messages.push({ ...msg, read: false, timestamp: Date.now() });
  window.dispatchEvent(new Event('InboxUpdated'));
}

/** Queue a message to arrive after delayMs real milliseconds. */
export function queueMessage(msg: Omit<InboxMessage, 'read' | 'timestamp'>, delayMs: number) {
  if (_messages.some((m) => m.id === msg.id)) return;
  if (_pending.some((p) => p.msg.id === msg.id)) return;
  _pending.push({ msg, deliverAt: Date.now() + delayMs });
  window.dispatchEvent(new Event('InboxUpdated'));
}

export function markRead(id: string) {
  const m = _messages.find((msg) => msg.id === id);
  if (m && !m.read) {
    m.read = true;
    window.dispatchEvent(new Event('InboxUpdated'));
  }
}

export function markReplied(messageId: string, replyId: string) {
  const m = _messages.find((msg) => msg.id === messageId);
  if (m && !m.repliedWith) {
    m.repliedWith = replyId;
    window.dispatchEvent(new Event('InboxUpdated'));
  }
}

export function getUnreadCount(): number {
  return _messages.filter((m) => !m.read).length;
}

export function getPendingCount(): number {
  return _pending.length;
}

export function isMessagePending(id: string): boolean {
  return _pending.some((p) => p.msg.id === id);
}
