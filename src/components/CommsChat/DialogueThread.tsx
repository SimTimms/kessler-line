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
import { DOCK_ROLE_LABELS, type DockContact } from '../../config/dockConfig';
import DialogHeader from './DialogHeader';
import DialogFooter from './DialogFooter';
import DialogMessages from './DialogMessages';
import SettlementInfoPanel from './SettlementInfoPanel';

type CommsViewMode = 'messages' | 'info' | 'dossier';
type TradeResourceKind = 'fuel' | 'o2' | 'power' | 'crew';
type TradeOfferDraft = Record<TradeResourceKind, number>;

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
  /** Dock interior NPC — portrait + dossier header instead of a ship profile. */
  character?: DockContact;
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
  isSavedContact?: boolean;
  onAddToContacts?: () => void;
  // Accepted dialogue
  thread: ChatThread | null;
  playerOptions: Array<{ id: string; label: string }>;
  showOptions: boolean;
  isEnded: boolean;
  onOption: (optionId: string) => void;
  canRequestRendezvous?: boolean;
  isRendezvousActive?: boolean;
  onRequestRendezvous?: () => void;
  tradePanel?: {
    visible: boolean;
    offer: TradeOfferDraft;
    maxOffer: TradeOfferDraft;
    statusLine?: string;
    pendingDeal?: TradeOfferDraft | null;
    canSubmit: boolean;
    submitLabel?: string;
    onOfferChange: (kind: TradeResourceKind, value: number) => void;
    onSubmit: () => void;
    onReset: () => void;
    onAcceptPendingDeal?: () => void;
    onRejectPendingDeal?: () => void;
  };
  onClose: () => void;
  onBack?: () => void;
}

export default function DialogueThread({
  shipId,
  shipName,
  contact,
  character,
  hideShipProfile = false,
  commsPlatform = RADIO_COMMS_PLATFORM,
  showHailPrompt = false,
  effectiveHailStatus,
  isRadioActive,
  hailOfferContent,
  onHail,
  onAcceptHail,
  onDeclineHail,
  isSavedContact = false,
  onAddToContacts,
  thread,
  playerOptions,
  showOptions,
  isEnded,
  onOption,
  canRequestRendezvous = false,
  isRendezvousActive = false,
  onRequestRendezvous,
  tradePanel,
  onClose,
  onBack,
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
    contact.relatedMessageIds.forEach((id) => markRead(id));
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

  // Skip the ship registry for station characters so their ids don't get
  // assigned ship profiles / radio dialogue trees.
  const record = contact || character ? null : getOrCreateShipRecord(shipId, shipName);
  const tradeRows: Array<{ key: TradeResourceKind; label: string; max: number; value: number }> = [
    { key: 'fuel', label: 'Fuel', max: tradePanel?.maxOffer.fuel ?? 0, value: tradePanel?.offer.fuel ?? 0 },
    { key: 'o2', label: 'O2', max: tradePanel?.maxOffer.o2 ?? 0, value: tradePanel?.offer.o2 ?? 0 },
    { key: 'power', label: 'Power', max: tradePanel?.maxOffer.power ?? 0, value: tradePanel?.offer.power ?? 0 },
    { key: 'crew', label: 'Crew', max: tradePanel?.maxOffer.crew ?? 0, value: tradePanel?.offer.crew ?? 0 },
  ];

  return (
    <div className="comms-chat" data-platform={commsPlatform}>
      {/* ── Header ── */}
      {character ? (
        <div className="comms-chat-header comms-chat-header--character">
          <img className="comms-chat-portrait" src={character.portrait} alt={character.name} />
          <div className="comms-chat-character-id">
            <div className="comms-chat-header-top">
              <div className="comms-chat-vessel">{character.name}</div>
              <button
                type="button"
                className="comms-chat-header-toggle"
                onClick={() => setViewMode((mode) => (mode === 'dossier' ? 'messages' : 'dossier'))}
                title={viewMode === 'dossier' ? 'Conversation' : 'Dossier'}
                aria-label={viewMode === 'dossier' ? 'Show conversation' : 'Show dossier'}
              >
                {viewMode === 'dossier' ? '✉' : 'ⓘ'}
              </button>
            </div>
            <div className="comms-chat-captain">
              {DOCK_ROLE_LABELS[character.role].toUpperCase()}
              {character.company ? ` · ${character.company.toUpperCase()}` : ' · INDEPENDENT'}
            </div>
          </div>
        </div>
      ) : contact ? (
        <DialogHeader contact={contact} />
      ) : (
        <div className="comms-chat-header">
          <div className="comms-chat-header-top">
            <div className="comms-chat-vessel">{shipName}</div>
            <div className="comms-chat-header-actions">
              {onAddToContacts && (
                <button
                  type="button"
                  className="comms-chat-header-action"
                  onClick={onAddToContacts}
                  title={isSavedContact ? 'Already in contacts' : 'Add to contacts'}
                  aria-label={isSavedContact ? 'Already in contacts' : 'Add to contacts'}
                  disabled={isSavedContact}
                >
                  {isSavedContact ? 'IN CONTACTS' : 'ADD TO CONTACTS'}
                </button>
              )}
              {hasSettlement && (
                <button
                  type="button"
                  className="comms-chat-header-toggle"
                  onClick={() => setViewMode((mode) => (mode === 'messages' ? 'info' : 'messages'))}
                  title={viewMode === 'messages' ? 'Station info' : 'Messages'}
                  aria-label={viewMode === 'messages' ? 'Show station info' : 'Show messages'}
                >
                  {viewMode === 'messages' ? 'ⓘ' : '✉'}
                </button>
              )}
            </div>
          </div>
          <div className="comms-chat-captain">
            {thread
              ? `${thread.captainName.toUpperCase()} · ${PLATFORM_UI[RADIO_COMMS_PLATFORM].fullName}`
              : PLATFORM_UI[RADIO_COMMS_PLATFORM].fullName}
          </div>
          {thread && !hideShipProfile && record && (
            <div className="comms-chat-profile">
              {formatShipClass(record.shipClass)} · {formatAgenda(record.agenda)}
              {record.destination !== 'none' ? ` → ${record.destination.toUpperCase()}` : ''}
              {' · '}
              {record.faction.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {viewMode === 'dossier' && character ? (
        <div className="comms-chat-dossier">
          <div className="comms-dossier-row">
            <span className="comms-dossier-key">NAME</span>
            <span className="comms-dossier-val">{character.name}</span>
          </div>
          <div className="comms-dossier-row">
            <span className="comms-dossier-key">AGE</span>
            <span className="comms-dossier-val">{character.age}</span>
          </div>
          <div className="comms-dossier-row">
            <span className="comms-dossier-key">BORN</span>
            <span className="comms-dossier-val">{character.birthplace}</span>
          </div>
          <div className="comms-dossier-row">
            <span className="comms-dossier-key">EMPLOYER</span>
            <span className="comms-dossier-val">{character.company ?? 'Independent'}</span>
          </div>
          <div className="comms-dossier-row">
            <span className="comms-dossier-key">ROLE</span>
            <span className="comms-dossier-val">{DOCK_ROLE_LABELS[character.role]}</span>
          </div>
          {character.bio && <p className="comms-dossier-bio">{character.bio}</p>}
        </div>
      ) : viewMode === 'info' && hasSettlement ? (
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
      {tradePanel?.visible && (
        <div className="comms-trade-panel">
          <div className="comms-trade-panel-title">NEGOTIATION OFFER</div>
          {tradePanel.statusLine && <div className="comms-trade-status">{tradePanel.statusLine}</div>}
          <div className="comms-trade-sliders">
            {tradeRows.map((row) => (
              <label key={row.key} className="comms-trade-slider-row">
                <span className="comms-trade-slider-label">{row.label}</span>
                <input
                  type="range"
                  min={0}
                  max={row.max}
                  value={Math.min(row.value, row.max)}
                  step={1}
                  onChange={(e) => tradePanel.onOfferChange(row.key, Number(e.target.value))}
                />
                <span className="comms-trade-slider-value">
                  {Math.round(Math.min(row.value, row.max))}/{Math.round(row.max)}
                </span>
              </label>
            ))}
          </div>
          {tradePanel.pendingDeal && (
            <div className="comms-trade-pending">
              <span className="comms-trade-pending-title">PROPOSED DEAL</span>
              <span className="comms-trade-pending-values">
                F {Math.round(tradePanel.pendingDeal.fuel)} · O {Math.round(tradePanel.pendingDeal.o2)} · P{' '}
                {Math.round(tradePanel.pendingDeal.power)} · C {Math.round(tradePanel.pendingDeal.crew)}
              </span>
            </div>
          )}
          <div className="comms-trade-actions">
            <button type="button" className="comms-chat-opt" onClick={tradePanel.onReset}>
              CLEAR
            </button>
            <button
              type="button"
              className="comms-chat-opt"
              onClick={tradePanel.onSubmit}
              disabled={!tradePanel.canSubmit}
            >
              {tradePanel.submitLabel ?? 'SEND OFFER'}
            </button>
            {tradePanel.pendingDeal && tradePanel.onAcceptPendingDeal && (
              <button type="button" className="comms-chat-opt" onClick={tradePanel.onAcceptPendingDeal}>
                AGREE
              </button>
            )}
            {tradePanel.pendingDeal && tradePanel.onRejectPendingDeal && (
              <button type="button" className="comms-chat-opt" onClick={tradePanel.onRejectPendingDeal}>
                DECLINE
              </button>
            )}
          </div>
        </div>
      )}
      <DialogFooter
        contact={contact ?? null}
        msgs={msgs}
        playerOptions={playerOptions}
        showOptions={viewMode === 'messages' && showOptions && !tradePanel?.visible}
        isPreHail={isPreHail}
        isEnded={isEnded}
        onClose={onClose}
        onBack={onBack}
        handleFooterOption={handleFooterOption}
        canRequestRendezvous={canRequestRendezvous}
        isRendezvousActive={isRendezvousActive}
        onRequestRendezvous={onRequestRendezvous}
      />
    </div>
  );
}
