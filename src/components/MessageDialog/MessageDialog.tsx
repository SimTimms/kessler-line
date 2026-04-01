import { useState, useEffect } from 'react';
import { speakNpcLine, cancelSpeech } from '../../sound/PiperTTS';
import type { InboxMessage, MessagePlatform, ReplyOption } from '../../context/MessageStore';
import { markReplied, queueMessage } from '../../context/MessageStore';
import { ASTEROID_DOCK_DEF } from '../../config/worldConfig';
import { waypointPromptDef } from '../../context/WaypointPrompt';
import { PLATFORM_UI } from '../../context/ActivePlatform';
import { PRIORITY_PLATFORMS } from '../../config/commsConfig';
import { computeOneWayDelayMs, formatGameDuration, computeDistanceAu } from '../../narrative/commsDelay';
import './MessageDialog.css';

interface MessageDialogProps {
  message: InboxMessage;
  wasUnread?: boolean;
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

interface SentState {
  reply: ReplyOption;
  isPriority: boolean;
  oneWayDelayMs: number;
  distanceAu: string;
}

export default function MessageDialog({ message, wasUnread, onClose, onMinimize }: MessageDialogProps) {
  const date = new Date(message.timestamp).toISOString().slice(0, 10);

  useEffect(() => {
    if (!wasUnread) return;

    if (message.audioFile) {
      const audio = new Audio(message.audioFile);
      audio.play().catch(() => {/* autoplay blocked */});
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    } else {
      let cancelled = false;
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) speakNpcLine(message.body, 'inbox-reader');
      }, 100);
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
        cancelSpeech();
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const platform = message.platform ?? 'REACH';
  const cfg = PLATFORM_CONFIG[platform];
  const isPriority = (PRIORITY_PLATFORMS as readonly string[]).includes(platform);

  const [replyOpen, setReplyOpen] = useState(false);
  const [sent, setSent] = useState<SentState | null>(() => {
    if (message.repliedWith && message.replies) {
      const reply = message.replies.find((r) => r.id === message.repliedWith);
      if (reply) {
        return {
          reply,
          isPriority,
          oneWayDelayMs: 0,
          distanceAu: '?',
        };
      }
    }
    return null;
  });

  const canReply = !sent && message.replies && message.replies.length > 0;

  function handleLinkClick(def: typeof ASTEROID_DOCK_DEF) {
    waypointPromptDef.current = def;
    window.dispatchEvent(new CustomEvent('open-minimap'));
    onMinimize?.();
  }

  function handleSendReply(reply: ReplyOption) {
    const locationId = message.senderLocationId;
    const oneWayMs = locationId && !isPriority ? computeOneWayDelayMs(locationId) : 0;
    const distAu = locationId ? computeDistanceAu(locationId) : '?';

    markReplied(message.id, reply.id);
    setSent({ reply, isPriority, oneWayDelayMs: oneWayMs, distanceAu: distAu });
    setReplyOpen(false);

    if (reply.npcResponse) {
      // NPC reply arrives after the round trip (2× one-way).
      const roundTripMs = oneWayMs * 2;
      queueMessage(reply.npcResponse, roundTripMs);
    }
  }

  return (
    <div className="md-backdrop" onClick={onClose}>
      <div className="md-dialog" data-platform={platform} data-version={PLATFORM_UI[platform]?.version ?? ''} onClick={(e) => e.stopPropagation()}>
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

        {/* Sent state */}
        {sent && (
          <div className="md-sent-panel">
            <div className="md-sent-header">
              {sent.isPriority || sent.reply.deliveryNote
                ? `OUTGOING — ${cfg.label}`
                : <span className="md-sent-transmitting">◈ TRANSMITTING — {cfg.label}</span>}
            </div>
            <div className="md-sent-body">{sent.reply.playerText}</div>
            {sent.reply.deliveryNote ? (
              <div className="md-delivery-note md-delivery-failed">{sent.reply.deliveryNote}</div>
            ) : sent.isPriority ? (
              <div className="md-delivery-note">STATUS: PRIORITY TRUNK · DELIVERED</div>
            ) : (
              <div className="md-delivery-telemetry">
                <div className="md-delivery-row">
                  <span className="md-delivery-label">DISTANCE</span>
                  <span className="md-delivery-value">{sent.distanceAu}</span>
                </div>
                <div className="md-delivery-row">
                  <span className="md-delivery-label">EST. DELIVERY</span>
                  <span className="md-delivery-value">{formatGameDuration(sent.oneWayDelayMs)}</span>
                </div>
                {sent.reply.npcResponse && (
                  <div className="md-delivery-row">
                    <span className="md-delivery-label">RESPONSE WINDOW</span>
                    <span className="md-delivery-value">{formatGameDuration(sent.oneWayDelayMs * 2)}</span>
                  </div>
                )}
                <div className="md-relay-animation">
                  <span className="md-relay-dot" />
                  <span className="md-relay-line" />
                  <span className="md-relay-dot md-relay-dot--mid" />
                  <span className="md-relay-line" />
                  <span className="md-relay-dot md-relay-dot--dest" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reply options */}
        {replyOpen && message.replies && (
          <div className="md-reply-panel">
            <div className="md-reply-header">SELECT RESPONSE</div>
            {message.replies.map((reply) => (
              <button key={reply.id} className="md-reply-option" onClick={() => handleSendReply(reply)}>
                {reply.label}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="md-actions">
          {canReply && (
            <button className="md-reply-btn" onClick={() => setReplyOpen(!replyOpen)}>
              {replyOpen ? '↩ CANCEL' : '↩ REPLY'}
            </button>
          )}
          <button className="md-close" onClick={onClose}>
            ✕ CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
