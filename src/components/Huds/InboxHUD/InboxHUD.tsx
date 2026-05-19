import { useState, useEffect, useRef } from 'react';
import {
  messageStore,
  markRead,
  getUnreadCount,
  isMessagePending,
  addMessage,
} from '../../context/MessageStore';
import type { InboxMessage } from '../../context/MessageStore';
import { activePlatform, PLATFORM_UI } from '../../context/ActivePlatform';
import { SelectionDialog } from '../SelectionDialog/SelectionDialog';
import MessageDialog from '../MessageDialog/MessageDialog';
import './InboxHUD.css';

const TRANSIENT_DURATION_MS = 2200;

interface HailRequest {
  shipId: string;
  type: 'trade' | 'mission';
}

const SHIP_DESIGNATIONS: Record<string, string> = {
  '0': 'HEKTOR-7',
};

const HAIL_CONTENT: Record<
  'trade' | 'mission',
  Record<string, { header: string; body: string }>
> = {
  trade: {
    '0': {
      header: 'SURPLUS CARGO — FUEL CELLS',
      body: "We're carrying more fuel cells than we need and they're eating into our margins. Half price if you take them now. We don't need the credits as much as we need the cargo space.",
    },
  },
  mission: {
    '0': {
      header: 'ESCORT CONTRACT',
      body: "Our drive is cycling wrong — diagnostics point to a thermal regulator but we can't fix it out here. Three days to the station at reduced thrust. We just need another ship in proximity while we limp in. Standard rate on arrival.",
    },
  },
};

export default function InboxHUD() {
  const [unread, setUnread] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [activeMessage, setActiveMessage] = useState<InboxMessage | null>(null);
  const [activeMessageWasUnread, setActiveMessageWasUnread] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [hailRequest, setHailRequest] = useState<HailRequest | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const prevUnreadRef = useRef(getUnreadCount());

  const ui = PLATFORM_UI[activePlatform];

  useEffect(() => {
    const clearHide = () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const showTransient = () => {
      setNotifVisible(true);
      clearHide();
      hideTimeoutRef.current = window.setTimeout(() => {
        setNotifVisible(false);
        hideTimeoutRef.current = null;
      }, TRANSIENT_DURATION_MS);
    };

    const onInboxUpdated = () => {
      const newCount = getUnreadCount();
      if (newCount > prevUnreadRef.current) showTransient();
      prevUnreadRef.current = newCount;
      setUnread(newCount);
    };
    const onNpcHailRequest = (e: Event) => {
      const detail = (e as CustomEvent<HailRequest>).detail;
      setHailRequest(detail);
    };
    const onRadioBeacon = showTransient;
    const onOpenInbox = () => {
      setInboxOpen(true);
      setNotifVisible(false);
    };

    window.addEventListener('InboxUpdated', onInboxUpdated);
    window.addEventListener('NPCHailRequest', onNpcHailRequest);
    window.addEventListener('RadioBeaconClicked', onRadioBeacon);
    window.addEventListener('OpenInbox', onOpenInbox);
    return () => {
      window.removeEventListener('InboxUpdated', onInboxUpdated);
      window.removeEventListener('NPCHailRequest', onNpcHailRequest);
      window.removeEventListener('RadioBeaconClicked', onRadioBeacon);
      window.removeEventListener('OpenInbox', onOpenInbox);
      clearHide();
    };
  }, []);

  function getTransmitStatus(m: InboxMessage): { statusLine?: string; statusPulse?: boolean } {
    if (!m.repliedWith || !m.replies) return {};
    const reply = m.replies.find((r) => r.id === m.repliedWith);
    if (!reply) return {};

    if (reply.deliveryNote) {
      return { statusLine: '✕ RELAY FAILED' };
    }
    if (reply.npcResponse) {
      const pending = isMessagePending(reply.npcResponse.id);
      const delivered = messageStore.current.some((msg) => msg.id === reply.npcResponse!.id);
      if (pending) return { statusLine: '◈ IN TRANSIT', statusPulse: true };
      if (delivered) return { statusLine: '✓ RESPONSE RECEIVED' };
    }
    return {};
  }

  const handleSelect = (id: string) => {
    const msg = messageStore.current.find((m) => m.id === id);
    if (msg) {
      const wasUnread = !msg.read;
      markRead(id);
      setActiveMessage(msg);
      setActiveMessageWasUnread(wasUnread);
    }
  };

  function handleAcceptHail() {
    if (!hailRequest) return;
    const { shipId, type } = hailRequest;
    const designation = SHIP_DESIGNATIONS[shipId] ?? `VESSEL-${shipId.toUpperCase()}`;
    const typeContent = HAIL_CONTENT[type];
    const content = typeContent[shipId] ?? typeContent['0'];

    const msgId = `npc-hail-${shipId}-${Date.now()}`;
    addMessage({
      id: msgId,
      from: designation,
      subject: content.header,
      body: content.body,
      platform: 'OPENLINE',
      replies: [
        {
          id: 'accept',
          label: type === 'trade' ? 'ACCEPT TRADE' : 'ACCEPT CONTRACT',
          playerText:
            type === 'trade'
              ? 'Deal. Transferring credits now.'
              : 'Copy that. Matching your heading, maintaining proximity.',
        },
        {
          id: 'decline',
          label: 'DECLINE',
          playerText: 'Not interested. Good luck out there.',
        },
      ],
    });

    const msg = messageStore.current.find((m) => m.id === msgId);
    if (msg) {
      markRead(msgId);
      setActiveMessage(msg);
      setActiveMessageWasUnread(true);
    }
    setHailRequest(null);
  }

  function handleDeclineHail() {
    setHailRequest(null);
  }

  return (
    <>
      <button
        className={`inbox-hud-btn${unread > 0 ? ' inbox-hud-btn--unread' : ''}`}
        data-platform={activePlatform}
        onClick={() => setInboxOpen(true)}
        title={`Open ${ui.fullName} messages`}
      >
        <span className="inbox-hud-platform-icon" aria-hidden>
          {ui.icon}
        </span>
        <span className="inbox-hud-platform-name">{ui.name}</span>
        {unread > 0 && <span className="inbox-hud-badge">{unread}</span>}
        {notifVisible && unread === 0 && <span className="inbox-hud-dot" aria-hidden />}
      </button>

      {hailRequest && (
        <div className="hail-request-banner">
          <div className="hail-request-label">HAIL REQUEST</div>
          <div className="hail-request-ship">
            {SHIP_DESIGNATIONS[hailRequest.shipId] ?? `VESSEL-${hailRequest.shipId.toUpperCase()}`}
          </div>
          <div className={`hail-request-type hail-request-type--${hailRequest.type}`}>
            {hailRequest.type === 'trade' ? 'TRADE OFFER' : 'MISSION OFFER'}
          </div>
          <div className="hail-request-actions">
            <button
              className="hail-request-btn hail-request-btn--accept"
              onClick={handleAcceptHail}
            >
              ACCEPT
            </button>
            <button
              className="hail-request-btn hail-request-btn--decline"
              onClick={handleDeclineHail}
            >
              DECLINE
            </button>
          </div>
        </div>
      )}

      {inboxOpen && (
        <SelectionDialog
          title={ui.inboxTitle}
          platform={activePlatform}
          items={messageStore.current.map((m) => ({
            id: m.id,
            label: m.subject,
            sublabel: m.from,
            statusIcon: m.read ? undefined : ui.unreadIcon,
            ...getTransmitStatus(m),
          }))}
          onSelect={handleSelect}
          onClose={() => setInboxOpen(false)}
        />
      )}

      {activeMessage && (
        <MessageDialog
          message={activeMessage}
          wasUnread={activeMessageWasUnread}
          onClose={() => setActiveMessage(null)}
          onMinimize={() => setActiveMessage(null)}
        />
      )}
    </>
  );
}
