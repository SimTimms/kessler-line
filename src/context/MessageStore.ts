export type MessagePlatform = 'REACH' | 'HERALD' | 'OPENLINE' | 'MERIDIAN' | 'BROADCAST';

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  timestamp: number;
  platform?: MessagePlatform;
}

const _messages: InboxMessage[] = [];

export const messageStore: { current: InboxMessage[] } = { current: _messages };

export function addMessage(msg: Omit<InboxMessage, 'read' | 'timestamp'>) {
  if (_messages.some((m) => m.id === msg.id)) return;
  _messages.push({ ...msg, read: false, timestamp: Date.now() });
  window.dispatchEvent(new Event('InboxUpdated'));
}

export function markRead(id: string) {
  const m = _messages.find((msg) => msg.id === id);
  if (m && !m.read) {
    m.read = true;
    window.dispatchEvent(new Event('InboxUpdated'));
  }
}

export function getUnreadCount(): number {
  return _messages.filter((m) => !m.read).length;
}
