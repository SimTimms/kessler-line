import type { MessagePlatform } from './MessageStore';

// Randomly selected messaging client for this session.
// BROADCAST is a degraded relay state, not an installable client.
const SELECTABLE: MessagePlatform[] = ['REACH', 'HERALD', 'OPENLINE', 'MERIDIAN'];

export const activePlatform: MessagePlatform =
  SELECTABLE[Math.floor(Math.random() * SELECTABLE.length)];

// ── Per-platform UI config ────────────────────────────────────────────────────

export interface PlatformUIConfig {
  name: string; // short name for button label
  fullName: string; // full name for dialog title
  icon: string; // unicode mark
  inboxTitle: string; // SelectionDialog title
  unreadIcon: string; // shown next to unread messages in the inbox list
  version?: string; // optional version string to show in NavHUD
  activeCredits?: number; // for future use: some platforms may have a "credits" system for paid comms or services, which could be shown in the NavHUD when active
}

export const PLATFORM_UI: Record<MessagePlatform, PlatformUIConfig> = {
  REACH: {
    name: 'REACH',
    fullName: 'REACH',
    icon: '⌒',
    inboxTitle: 'REACH · INBOX',
    unreadIcon: '⊙', // signal/pulse dot — incoming transmission
    version: '1.0.0',
    activeCredits: 0,
  },
  HERALD: {
    name: 'HERALD',
    fullName: 'HERALD',
    icon: '◉',
    inboxTitle: 'HERALD · INBOX',
    unreadIcon: '◼', // sealed stamp — authoritative, corporate
    version: '4.2.1',
    activeCredits: 970,
  },
  OPENLINE: {
    name: 'OPENLINE',
    fullName: 'OPENLINE',
    icon: '⊃',
    inboxTitle: 'OPENLINE · INBOX',
    unreadIcon: '▸', // incoming arrow — directional, anonymous
    version: '0.9.3-beta',
    activeCredits: 1200,
  },
  MERIDIAN: {
    name: 'MERIDIAN',
    fullName: 'MERIDIAN / ARESNAV',
    icon: '⊕',
    inboxTitle: 'MERIDIAN · INBOX',
    unreadIcon: '◈', // nav waypoint diamond — new beacon
    version: '3.1.0',
    activeCredits: 450,
  },
  BROADCAST: {
    name: 'REACH',
    fullName: 'REACH',
    icon: '⌒',
    inboxTitle: 'REACH · INBOX',
    unreadIcon: '⊙',
    version: '1.0.0',
    activeCredits: 0,
  },
};
