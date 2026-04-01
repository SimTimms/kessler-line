import { type MessagePlatform } from '../../context/MessageStore';

interface DialogHeaderProps {
  contact: {
    name: string;
    platform: string;
  };
}

const PLATFORM_CONFIG: Record<
  MessagePlatform,
  { label: string; statusLine: string; subLine?: string }
> = {
  REACH: { label: 'REACH', statusLine: 'P2 RELAY · DELIVERED' },
  HERALD: {
    label: 'HERALD',
    statusLine: 'P0 PRIORITY · TRUNK ACCESS SUSPENDED',
    subLine: 'CREDENTIAL: [EMBEDDED] — STATUS: UNVERIFIED',
  },
  OPENLINE: {
    label: 'OPENLINE',
    statusLine: 'ENCRYPTED · MESH RELAY',
    subLine: 'SENDER IDENTITY: ANONYMOUS',
  },
  MERIDIAN: { label: 'MERIDIAN / ARESNAV', statusLine: 'P2 RELAY', subLine: 'WAYPOINT: NONE' },
  BROADCAST: {
    label: 'REACH',
    statusLine: 'P3 ECONOMY · BROADCAST FALLBACK',
    subLine: 'ACCOUNT: UNVERIFIED · DESTINATION: UNRESOLVABLE',
  },
};

export default function DialogHeader({ contact }: DialogHeaderProps) {
  const cfg = PLATFORM_CONFIG[contact.platform as MessagePlatform] ?? PLATFORM_CONFIG.REACH;
  return (
    <div className="comms-chat-header">
      <div className="comms-chat-vessel">{contact.name}</div>
      <div className="comms-chat-captain">
        {cfg.label} · {cfg.statusLine}
      </div>
      {cfg.subLine && <div className="comms-chat-profile">{cfg.subLine}</div>}
    </div>
  );
}
