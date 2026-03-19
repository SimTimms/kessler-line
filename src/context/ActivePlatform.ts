import type { MessagePlatform } from './MessageStore';

// Randomly selected messaging client for this session.
// BROADCAST is a degraded relay state, not an installable client.
const SELECTABLE: MessagePlatform[] = ['REACH', 'HERALD', 'OPENLINE', 'MERIDIAN'];

export const activePlatform: MessagePlatform =
  SELECTABLE[Math.floor(Math.random() * SELECTABLE.length)];

// ── Per-platform UI config ────────────────────────────────────────────────────

export interface PlatformUIConfig {
  name: string;         // short name for button label
  fullName: string;     // full name for dialog title
  icon: string;         // unicode mark
  inboxTitle: string;   // SelectionDialog title
}

export const PLATFORM_UI: Record<MessagePlatform, PlatformUIConfig> = {
  REACH: {
    name: 'REACH',
    fullName: 'REACH',
    icon: '⌒',
    inboxTitle: 'REACH · INBOX',
  },
  HERALD: {
    name: 'HERALD',
    fullName: 'HERALD',
    icon: '◉',
    inboxTitle: 'HERALD · INBOX',
  },
  OPENLINE: {
    name: 'OPENLINE',
    fullName: 'OPENLINE',
    icon: '⊃',
    inboxTitle: 'OPENLINE · INBOX',
  },
  MERIDIAN: {
    name: 'MERIDIAN',
    fullName: 'MERIDIAN / ARESNAV',
    icon: '⊕',
    inboxTitle: 'MERIDIAN · INBOX',
  },
  BROADCAST: {
    name: 'REACH',
    fullName: 'REACH',
    icon: '⌒',
    inboxTitle: 'REACH · INBOX',
  },
};
