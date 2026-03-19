import type { InboxMessage, MessagePlatform } from '../../context/MessageStore';
import { ASTEROID_DOCK_DEF } from '../../config/worldConfig';
import { waypointPromptDef } from '../../context/WaypointPrompt';
import './MessageDialog.css';

interface MessageDialogProps {
  message: InboxMessage;
  onClose: () => void;
  onMinimize?: () => void;
}

const LINKABLE: { text: string; def: typeof ASTEROID_DOCK_DEF }[] = [
  { text: 'Asteroid Dock', def: ASTEROID_DOCK_DEF },
];

interface PlatformConfig {
  label: string;
  statusLine: string;
  subLine?: string;
}

const PLATFORM_CONFIG: Record<MessagePlatform, PlatformConfig> = {
  REACH: {
    label: 'REACH',
    statusLine: 'P2 RELAY · DELIVERED',
  },
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
  MERIDIAN: {
    label: 'MERIDIAN / ARESNAV',
    statusLine: 'P2 RELAY',
    subLine: 'WAYPOINT: NONE',
  },
  BROADCAST: {
    label: 'REACH',
    statusLine: 'P3 ECONOMY · BROADCAST FALLBACK',
    subLine: 'ACCOUNT: UNVERIFIED · DESTINATION: UNRESOLVABLE',
  },
};

function renderBody(body: string, onLinkClick: (def: typeof ASTEROID_DOCK_DEF) => void) {
  const pattern = new RegExp(`(${LINKABLE.map((l) => l.text).join('|')})`, 'g');
  const parts = body.split(pattern);
  return parts.map((part, i) => {
    const link = LINKABLE.find((l) => l.text === part);
    if (link) {
      return (
        <button key={i} className="md-link" onClick={() => onLinkClick(link.def)}>
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageDialog({ message, onClose, onMinimize }: MessageDialogProps) {
  const date = new Date(message.timestamp).toISOString().slice(0, 10);
  const platform = message.platform ?? 'REACH';
  const cfg = PLATFORM_CONFIG[platform];

  function handleLinkClick(def: typeof ASTEROID_DOCK_DEF) {
    waypointPromptDef.current = def;
    window.dispatchEvent(new CustomEvent('open-minimap'));
    onMinimize?.();
  }

  return (
    <div className="md-backdrop" onClick={onClose}>
      <div className="md-dialog" data-platform={platform} onClick={(e) => e.stopPropagation()}>
        <div className="md-platform-header">
          <span className="md-platform-label">{cfg.label}</span>
          <span className="md-platform-sep"> · </span>
          <span className="md-platform-status">{cfg.statusLine}</span>
          {cfg.subLine && <div className="md-platform-subline">{cfg.subLine}</div>}
        </div>
        <div className="md-meta">
          <span className="md-from">FROM: {message.from}</span>
          <span className="md-date">{date}</span>
        </div>
        <div className="md-subject">{message.subject}</div>
        <div className="md-divider" />
        <div className="md-body">{renderBody(message.body, handleLinkClick)}</div>
        <button className="md-close" onClick={onClose}>
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
