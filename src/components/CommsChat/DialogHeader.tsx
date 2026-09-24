import { type MessagePlatform } from '../../context/MessageStore';
import CommsIdentityHeader from './CommsIdentityHeader';

interface DialogHeaderProps {
  contact: {
    name: string;
    platform: string;
    role?: string;
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
    <CommsIdentityHeader
      name={contact.name}
      lines={[contact.role, `${cfg.label} · ${cfg.statusLine}`, cfg.subLine]}
    />
  );
}
