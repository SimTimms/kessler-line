import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { ChatThread } from '../../context/ChatStore';
import type { HailStatus } from '../../context/HailState';
import type { StaticContact } from '../../narrative/contacts';
import {
  messageStore,
  markRead,
  markReplied,
  queueMessage,
  isMessagePending,
  type InboxMessage,
  type MessagePlatform,
} from '../../context/MessageStore';
import { PRIORITY_PLATFORMS, RADIO_COMMS_PLATFORM } from '../../config/commsConfig';
import { PLATFORM_UI } from '../../context/ActivePlatform';
import {
  computeOneWayDelayMs,
  formatGameDuration,
  computeDistanceAu,
} from '../../narrative/commsDelay';
import { ASTEROID_DOCK_DEF } from '../../config/worldConfig';
import { waypointPromptDef } from '../../context/WaypointPrompt';
import { getOrCreateShipRecord, formatShipClass, formatAgenda } from '../../narrative/shipRegistry';
import { SETTLEMENT_BY_OBJECT_ID } from '../../config/settlementConfig';
import DialogHeader from './DialogHeader';
import DialogFooter from './DialogFooter';
import DialogMessages from './DialogMessages';
import SettlementInfoPanel from './SettlementInfoPanel';

type CommsViewMode = 'messages' | 'info';

const LINKABLE: { text: string; def: typeof ASTEROID_DOCK_DEF }[] = [
  { text: 'Asteroid Dock', def: ASTEROID_DOCK_DEF },
];

function renderBody(body: string, onLinkClick: (def: typeof ASTEROID_DOCK_DEF) => void): ReactNode {
  const pattern = new RegExp(`(${LINKABLE.map((l) => l.text).join('|')})`, 'g');
  const parts = body.split(pattern);
  return parts.map((part, i) => {
    const link = LINKABLE.find((l) => l.text === part);
    if (link) {
      return (
        <button key={i} className="comms-inbox-link" onClick={() => onLinkClick(link.def)}>
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function getContactMessages(contact: StaticContact): InboxMessage[] {
  return messageStore.current.filter((m) => contact.relatedMessageIds.includes(m.id));
}

type DisplayRow = {
  id: string;
  role: 'npc' | 'player';
  senderName?: string;
  content: ReactNode;
  timestamp: number;
  timeLabel?: ReactNode;
};

interface DialogueThreadProps {
  shipId: string;
  shipName: string;
  // Inbox mode (static contact)
  contact?: StaticContact;
  /** Broadcast / world-object hail — hide random NPC ship profile line. */
  hideShipProfile?: boolean;
  commsPlatform?: MessagePlatform;
  // Pre-hail
  showHailPrompt?: boolean;
  effectiveHailStatus: HailStatus;
  isRadioActive: boolean;
  hailOfferContent?: { header: string; body: string };
  onHail?: () => void;
  onAcceptHail?: () => void;
  onDeclineHail?: () => void;
  // Accepted dialogue
  thread: ChatThread | null;
  playerOptions: Array<{ id: string; label: string }>;
  showOptions: boolean;
  isEnded: boolean;
  onOption: (optionId: string) => void;
  onClose: () => void;
}

export default function DialogueThread({
  shipId,
  shipName,
  contact,
  hideShipProfile = false,
  commsPlatform = RADIO_COMMS_PLATFORM,
  showHailPrompt = false,
  effectiveHailStatus,
  isRadioActive,
  hailOfferContent,
  onHail,
  onAcceptHail,
  onDeclineHail,
  thread,
  playerOptions,
  showOptions,
  isEnded,
  onOption,
  onClose,
}: DialogueThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasSettlement = !contact && SETTLEMENT_BY_OBJECT_ID[shipId] !== undefined;
  const [viewMode, setViewMode] = useState<CommsViewMode>('messages');

  const [msgs, setMsgs] = useState<InboxMessage[]>(() =>
    contact ? getContactMessages(contact) : []
  );

  const platform = (contact?.platform as MessagePlatform) ?? 'REACH';
  const isPriority = (PRIORITY_PLATFORMS as readonly string[]).includes(platform);

  useEffect(() => {
    if (!contact) return;
    const unreadWithAudio = msgs.find((m) => !m.read && m.audioFile);
    contact.relatedMessageIds.forEach((id) => markRead(id));
    if (unreadWithAudio?.audioFile) {
      const audio = new Audio(unreadWithAudio.audioFile);
      audio.play().catch(() => { /* autoplay blocked */ });
      return () => { audio.pause(); audio.currentTime = 0; };
    }
  }, [contact]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setViewMode('messages');
  }, [shipId]);

  useEffect(() => {
    if (!contact) return;
    const onUpdate = () => setMsgs(getContactMessages(contact));
    window.addEventListener('InboxUpdated', onUpdate);
    return () => window.removeEventListener('InboxUpdated', onUpdate);
  }, [contact]);

  useEffect(() => {
    if (contact) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (effectiveHailStatus === 'accepted') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs.length, thread?.messages.length, contact, effectiveHailStatus]);

  function handleReply(msg: InboxMessage, replyId: string) {
    if (!contact) return;
    const reply = msg.replies?.find((r) => r.id === replyId);
    if (!reply) return;
    markReplied(msg.id, replyId);
    if (reply.npcResponse) {
      const locationId = msg.senderLocationId;
      const oneWayMs = locationId && !isPriority ? computeOneWayDelayMs(locationId) : 0;
      queueMessage(reply.npcResponse, oneWayMs * 2);
    }
    setMsgs(getContactMessages(contact));
  }

  function handleLinkClick(def: typeof ASTEROID_DOCK_DEF) {
    waypointPromptDef.current = def;
    window.dispatchEvent(new CustomEvent('open-minimap'));
    onClose();
  }

  // ── Normalize messages to a common display format ─────────────────────────
  const displayRows: DisplayRow[] = contact
    ? msgs.flatMap((msg) => {
        const rows: DisplayRow[] = [
          {
            id: msg.id,
            role: 'npc',
            senderName: msg.subject,
            content: renderBody(msg.body, handleLinkClick),
            timestamp: msg.timestamp,
          },
        ];

        const repliedOption = msg.repliedWith
          ? msg.replies?.find((r) => r.id === msg.repliedWith)
          : null;

        if (repliedOption) {
          const hasNpcResponse = !!repliedOption.npcResponse;
          const npcPending = hasNpcResponse && isMessagePending(repliedOption.npcResponse!.id);
          const npcDelivered =
            hasNpcResponse &&
            messageStore.current.some((m) => m.id === repliedOption.npcResponse!.id);
          const locationId = msg.senderLocationId;
          const oneWayMs = locationId && !isPriority ? computeOneWayDelayMs(locationId) : 0;
          const distAu = locationId ? computeDistanceAu(locationId) : null;

          const timeLabel = repliedOption.deliveryNote
            ? '✕ RELAY FAILED'
            : isPriority
              ? '✓ DELIVERED'
              : npcDelivered
                ? '✓ RESPONSE RECEIVED'
                : npcPending
                  ? `◈ IN TRANSIT · ${distAu ?? '?'} · EST. ${formatGameDuration(oneWayMs)}`
                  : '◈ TRANSMITTING';

          rows.push({
            id: msg.id + '-reply',
            role: 'player',
            content: repliedOption.playerText,
            timestamp: msg.timestamp,
            timeLabel,
          });
        }

        return rows;
      })
    : (thread?.messages ?? []).map((msg) => ({
        id: msg.id,
        role: msg.role,
        senderName: msg.role === 'npc' ? thread!.captainName : undefined,
        content: msg.text,
        timestamp: msg.timestamp,
      }));

  // ── Footer options ─────────────────────────────────────────────────────────
  const isPreHail = !contact && effectiveHailStatus !== 'accepted';
  const pendingReplyMsg = contact ? msgs.find((m) => !m.repliedWith && m.replies?.length) : null;

  const handleFooterOption = (optionId: string) => {
    if (contact && pendingReplyMsg) {
      handleReply(pendingReplyMsg, optionId);
      return;
    }
    if (!contact) {
      onOption(optionId);
    }
  };

  const record = getOrCreateShipRecord(shipId, shipName);

  return (
    <div className="comms-chat" data-platform={commsPlatform}>
      {/* ── Header ── */}
      {contact ? (
        <DialogHeader contact={contact} />
      ) : (
        <div className="comms-chat-header">
          <div className="comms-chat-header-top">
            <div className="comms-chat-vessel">{shipName}</div>
            {hasSettlement && (
              <button
                type="button"
                className="comms-chat-header-toggle"
                onClick={() =>
                  setViewMode((mode) => (mode === 'messages' ? 'info' : 'messages'))
                }
                title={viewMode === 'messages' ? 'Station info' : 'Messages'}
                aria-label={viewMode === 'messages' ? 'Show station info' : 'Show messages'}
              >
                {viewMode === 'messages' ? 'ⓘ' : '✉'}
              </button>
            )}
          </div>
          <div className="comms-chat-captain">
            {thread
              ? `${thread.captainName.toUpperCase()} · ${PLATFORM_UI[RADIO_COMMS_PLATFORM].fullName}`
              : PLATFORM_UI[RADIO_COMMS_PLATFORM].fullName}
          </div>
          {thread && !hideShipProfile && (
            <div className="comms-chat-profile">
              {formatShipClass(record.shipClass)} · {formatAgenda(record.agenda)}
              {record.destination !== 'none' ? ` → ${record.destination.toUpperCase()}` : ''}
              {' · '}
              {record.faction.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {viewMode === 'info' && hasSettlement ? (
        <SettlementInfoPanel objectId={shipId} />
      ) : (
        <DialogMessages
          isPreHail={isPreHail}
          showHailPrompt={showHailPrompt}
          isRadioActive={isRadioActive}
          effectiveHailStatus={effectiveHailStatus}
          hailOfferContent={hailOfferContent}
          onHail={onHail}
          onAcceptHail={onAcceptHail}
          onDeclineHail={onDeclineHail}
          contact={contact ?? null}
          displayRows={displayRows}
          thread={thread}
          shipName={shipName}
          bottomRef={bottomRef}
        />
      )}
      <DialogFooter
        contact={contact ?? null}
        msgs={msgs}
        playerOptions={playerOptions}
        showOptions={viewMode === 'messages' && showOptions}
        isPreHail={isPreHail}
        isEnded={isEnded}
        onClose={onClose}
        handleFooterOption={handleFooterOption}
      />
    </div>
  );
}
