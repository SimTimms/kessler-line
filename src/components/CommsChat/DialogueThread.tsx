import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
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
import ContactDossier from './ContactDossier';
import {
  getLinkedHistory,
  getLinkedHistoryLabel,
  resolvePersonContact,
} from '../../narrative/contactIdentity';
import DialogHeader from './DialogHeader';
import CommsIdentityHeader from './CommsIdentityHeader';
import DialogFooter from './DialogFooter';
import DialogMessages from './DialogMessages';
import SettlementInfoPanel from './SettlementInfoPanel';
import TradeCargoGrid from './TradeCargoGrid';

type CommsViewMode = 'messages' | 'info' | 'dossier';
type TradeResourceKind = 'fuel' | 'o2' | 'power' | 'crew';
type TradeOfferDraft = Record<TradeResourceKind, number>;

export type CargoBarterSideDraft = Record<string, number>;

export interface CargoBarterDealDraft {
  playerGives: CargoBarterSideDraft;
  contactGives: CargoBarterSideDraft;
}

export interface CargoBarterRow {
  itemId: string;
  label: string;
  max: number;
  value: number;
}

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
  audioSrc?: string;
  /** Carried in from this person's other channel — shown above a divider. */
  isHistory?: boolean;
};

interface DialogueThreadProps {
  shipId: string;
  shipName: string;
  /** Render inside parent container instead of as a fixed overlay. */
  inline?: boolean;
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
  canReceive?: boolean;
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
  canRequestDockPermission?: boolean;
  isDockPermissionGranted?: boolean;
  onRequestDockPermission?: () => void;
  tradePanel?: {
    visible: boolean;
    mode?: 'resources' | 'cargo';
    /** Resource-mode (legacy) offer. */
    offer?: TradeOfferDraft;
    maxOffer?: TradeOfferDraft;
    /** Cargo-mode two-sided deal. */
    cargoDeal?: CargoBarterDealDraft;
    playerCargoRows?: CargoBarterRow[];
    contactCargoRows?: CargoBarterRow[];
    statusLine?: string;
    pendingDeal?: TradeOfferDraft | null;
    pendingCargoDeal?: CargoBarterDealDraft | null;
    pendingCargoSummary?: string;
    canSubmit: boolean;
    submitLabel?: string;
    onOfferChange?: (kind: TradeResourceKind, value: number) => void;
    onCargoOfferChange?: (
      side: 'playerGives' | 'contactGives',
      itemId: string,
      value: number
    ) => void;
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
  inline = false,
  contact,
  character,
  hideShipProfile = false,
  commsPlatform = RADIO_COMMS_PLATFORM,
  showHailPrompt = false,
  effectiveHailStatus,
  isRadioActive,
  canReceive = true,
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
  canRequestDockPermission = false,
  isDockPermissionGranted = false,
  onRequestDockPermission,
  tradePanel,
  onClose,
  onBack,
}: DialogueThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  /** Cleared per thread so the first open lands on the divider, later ones don't. */
  const settledRef = useRef(false);
  const hasSettlement = !contact && SETTLEMENT_BY_OBJECT_ID[shipId] !== undefined;
  const [viewMode, setViewMode] = useState<CommsViewMode>('messages');

  // A narrative hail reuses the dock contact's id, so the same person keeps
  // their portrait, role and dossier whichever channel they come in on.
  const identityContact = character ?? (contact ? undefined : resolvePersonContact(shipId));
  const identityName = identityContact?.name;

  // Parents such as DockTransferHUD re-render every frame, so the cross-channel
  // history is recomputed only when some thread actually changes.
  const [linkedVersion, bumpLinked] = useState(0);
  const linkedHistory = useMemo(
    () => (contact ? [] : getLinkedHistory(shipId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute on any thread change
    [contact, shipId, thread?.messages.length, linkedVersion]
  );
  const linkedHistoryLabel = linkedHistory.length > 0 ? getLinkedHistoryLabel(shipId) : undefined;

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
    settledRef.current = false;
  }, [shipId]);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const sid = (e as CustomEvent<{ shipId: string }>).detail?.shipId;
      if (sid && sid !== shipId) bumpLinked((n) => n + 1);
    };
    window.addEventListener('ChatUpdated', onUpdate);
    return () => window.removeEventListener('ChatUpdated', onUpdate);
  }, [shipId]);

  useEffect(() => {
    if (!contact) return;
    const onUpdate = () => setMsgs(getContactMessages(contact));
    window.addEventListener('InboxUpdated', onUpdate);
    return () => window.removeEventListener('InboxUpdated', onUpdate);
  }, [contact]);

  useEffect(() => {
    // First look at a conversation that carries history from another channel:
    // park on the divider so the earlier messages are visibly above it. Threads
    // with no history never have a divider and just pin to the newest message.
    if (
      !contact &&
      effectiveHailStatus === 'accepted' &&
      !settledRef.current &&
      dividerRef.current
    ) {
      settledRef.current = true;
      dividerRef.current.scrollIntoView({ block: 'start' });
      return;
    }
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
    : // Same person reached on another channel — merge their history in by
      // timestamp so a hail carries the station conversation and vice versa.
      [
        ...linkedHistory.map((msg) => ({ msg, isHistory: true })),
        ...(thread?.messages ?? []).map((msg) => ({ msg, isHistory: false })),
      ]
        .sort((a, b) => a.msg.timestamp - b.msg.timestamp)
        .map(({ msg, isHistory }) => ({
          id: msg.id,
          role: msg.role,
          senderName: msg.role === 'npc' ? (identityName ?? thread?.captainName) : undefined,
          content: msg.text,
          timestamp: msg.timestamp,
          audioSrc: msg.audioSrc,
          isHistory,
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
  const record = contact || identityContact ? null : getOrCreateShipRecord(shipId, shipName);

  // Ship / broadcast contacts have no portrait or dossier, so their identity
  // block carries the captain up top and the vessel details underneath.
  const platformName = PLATFORM_UI[RADIO_COMMS_PLATFORM].fullName;
  const vesselIdentity = {
    name: (thread?.captainName ?? shipName).toUpperCase(),
    lines: [
      thread && thread.captainName !== shipName
        ? `${shipName.toUpperCase()} · ${platformName}`
        : platformName,
      thread && !hideShipProfile && record
        ? `${formatShipClass(record.shipClass)} · ${formatAgenda(record.agenda)}${
            record.destination !== 'none' ? ` → ${record.destination.toUpperCase()}` : ''
          } · ${record.faction.toUpperCase()}`
        : null,
    ],
  };

  const tradeMode = tradePanel?.mode ?? 'resources';
  const tradeRows: Array<{ key: TradeResourceKind; label: string; max: number; value: number }> = [
    {
      key: 'fuel',
      label: 'Fuel',
      max: tradePanel?.maxOffer?.fuel ?? 0,
      value: tradePanel?.offer?.fuel ?? 0,
    },
    {
      key: 'o2',
      label: 'O2',
      max: tradePanel?.maxOffer?.o2 ?? 0,
      value: tradePanel?.offer?.o2 ?? 0,
    },
    {
      key: 'power',
      label: 'Power',
      max: tradePanel?.maxOffer?.power ?? 0,
      value: tradePanel?.offer?.power ?? 0,
    },
    {
      key: 'crew',
      label: 'Crew',
      max: tradePanel?.maxOffer?.crew ?? 0,
      value: tradePanel?.offer?.crew ?? 0,
    },
  ];
  const hasPendingDeal =
    tradeMode === 'cargo' ? !!tradePanel?.pendingCargoDeal : !!tradePanel?.pendingDeal;

  const footerOptions = contact
    ? (pendingReplyMsg?.replies ?? []).map((r) => ({ id: r.id, label: r.label }))
    : !isPreHail && showOptions
      ? playerOptions
      : [];

  return (
    <div
      className={`comms-chat${inline ? ' comms-chat--inline' : ''}`}
      data-platform={commsPlatform}
    >
      {/* ── Channel title bar ── */}
      <div className="comms-chat-titlebar">
        <span className="hud-title">{isPreHail ? 'COMMS' : 'COMMS OPEN'}</span>
      </div>

      {/* ── Header ── */}
      {identityContact ? (
        <CommsIdentityHeader
          portrait={identityContact.portrait}
          name={identityContact.name}
          lines={[
            DOCK_ROLE_LABELS[identityContact.role].toUpperCase(),
            identityContact.company ? identityContact.company.toUpperCase() : 'INDEPENDENT',
          ]}
          actions={
            <button
              type="button"
              className="comms-chat-header-toggle"
              onClick={() => setViewMode((mode) => (mode === 'dossier' ? 'messages' : 'dossier'))}
              title={viewMode === 'dossier' ? 'Conversation' : 'Dossier'}
              aria-label={viewMode === 'dossier' ? 'Show conversation' : 'Show dossier'}
            >
              {viewMode === 'dossier' ? '✉' : 'ⓘ'}
            </button>
          }
        />
      ) : contact ? (
        <DialogHeader contact={contact} />
      ) : (
        <CommsIdentityHeader
          name={vesselIdentity.name}
          lines={vesselIdentity.lines}
          actions={
            onAddToContacts || hasSettlement ? (
              <>
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
                    onClick={() =>
                      setViewMode((mode) => (mode === 'messages' ? 'info' : 'messages'))
                    }
                    title={viewMode === 'messages' ? 'Station info' : 'Messages'}
                    aria-label={viewMode === 'messages' ? 'Show station info' : 'Show messages'}
                  >
                    {viewMode === 'messages' ? 'ⓘ' : '✉'}
                  </button>
                )}
              </>
            ) : undefined
          }
        />
      )}

      {viewMode === 'dossier' && identityContact ? (
        <ContactDossier data={identityContact} />
      ) : viewMode === 'info' && hasSettlement ? (
        <SettlementInfoPanel objectId={shipId} />
      ) : (
        <DialogMessages
          isPreHail={isPreHail}
          showHailPrompt={showHailPrompt}
          isRadioActive={isRadioActive}
          canReceive={canReceive}
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
          dividerRef={dividerRef}
          historyLabel={linkedHistoryLabel}
        />
      )}
      {tradePanel?.visible && (
        <div className="comms-trade-panel">
          <div className="hud-subtitle-grey">
            {tradeMode === 'cargo' ? 'NEGOTIATION' : 'NEGOTIATION OFFER'}
          </div>
          {tradeMode === 'cargo' ? (
            <TradeCargoGrid
              playerRows={tradePanel.playerCargoRows ?? []}
              contactRows={tradePanel.contactCargoRows ?? []}
              cargoDeal={tradePanel.cargoDeal}
              onCargoOfferChange={tradePanel.onCargoOfferChange}
            />
          ) : (
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
                    onChange={(e) => tradePanel.onOfferChange?.(row.key, Number(e.target.value))}
                  />
                  <span className="comms-trade-slider-value">
                    {Math.round(Math.min(row.value, row.max))}/{Math.round(row.max)}
                  </span>
                </label>
              ))}
            </div>
          )}
          {tradeMode === 'cargo' && tradePanel.pendingCargoDeal && (
            <div className="comms-trade-pending">
              <span className="comms-trade-pending-values">
                {tradePanel.pendingCargoSummary ?? 'Awaiting confirmation'}
              </span>
            </div>
          )}
          {tradeMode === 'resources' && tradePanel.pendingDeal && (
            <div className="comms-trade-pending">
              <span className="comms-trade-pending-values">
                F {Math.round(tradePanel.pendingDeal.fuel)} · O{' '}
                {Math.round(tradePanel.pendingDeal.o2)} · P{' '}
                {Math.round(tradePanel.pendingDeal.power)} · C{' '}
                {Math.round(tradePanel.pendingDeal.crew)}
              </span>
            </div>
          )}

          <div className="comms-trade-actions">
            {hasPendingDeal ? (
              <>
                {tradePanel.onRejectPendingDeal && (
                  <button
                    type="button"
                    className="comms-chat-close"
                    onClick={tradePanel.onRejectPendingDeal}
                  >
                    Back
                  </button>
                )}
                {tradePanel.onAcceptPendingDeal && (
                  <button
                    type="button"
                    className="comms-chat-close"
                    onClick={tradePanel.onAcceptPendingDeal}
                  >
                    Confirm
                  </button>
                )}
              </>
            ) : (
              <>
                <button type="button" className="comms-chat-close" onClick={tradePanel.onReset}>
                  CLEAR
                </button>
                <button
                  type="button"
                  className="comms-chat-close"
                  onClick={tradePanel.onSubmit}
                  disabled={!tradePanel.canSubmit}
                >
                  {tradePanel.submitLabel ?? 'SEND OFFER'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {!contact && !isRadioActive && (
        <div className="comms-chat-status-line">○ TRANSMIT RANGE EXCEEDED</div>
      )}
      {footerOptions.length > 0 && (
        <div className="comms-chat-options">
          {footerOptions.map((opt) => (
            <button
              key={opt.id}
              className="comms-chat-close"
              onClick={() => handleFooterOption(opt.id)}
              disabled={!contact && !isRadioActive}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <DialogFooter
        contact={contact ?? null}
        msgs={msgs}
        playerOptions={playerOptions}
        showOptions={viewMode === 'messages' && showOptions && !tradePanel?.visible}
        isPreHail={isPreHail}
        isEnded={isEnded}
        canTransmit={isRadioActive}
        onClose={onClose}
        onBack={onBack}
        handleFooterOption={handleFooterOption}
        canRequestRendezvous={canRequestRendezvous}
        isRendezvousActive={isRendezvousActive}
        onRequestRendezvous={onRequestRendezvous}
        canRequestDockPermission={canRequestDockPermission}
        isDockPermissionGranted={isDockPermissionGranted}
        onRequestDockPermission={onRequestDockPermission}
      />
    </div>
  );
}
