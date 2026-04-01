import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { getDriveSignatures } from '../../context/DriveSignatureRegistry';
import { shipPosRef } from '../../context/ShipPos';
import {
  messageStore,
  addMessage,
  queueMessage,
  markRead,
  getUnreadCount,
} from '../../context/MessageStore';
import { activePlatform, PLATFORM_UI } from '../../context/ActivePlatform';
import { KM_PER_UNIT } from '../../config/commsConfig';
import { STATIC_CONTACTS } from '../../narrative/contacts';
import { type HailStatus, setHailStatus } from '../../context/HailState';
import {
  setIncomingHail,
  dismissIncomingHail,
  type IncomingHailEventDetail,
} from '../../context/IncomingHailState';
import { RADIO_BROADCAST_DEFS } from '../../config/worldConfig';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { getCollidables } from '../../context/CollisionRegistry';
import { ContactsHudDialog } from './ContactsHudDialog/ContactsHudDialog';
import type { SelectionItem } from './ContactsHudDialog/ContactsHudDialog';
import CommsChat from '../CommsChat/CommsChat';
import './ContactsHUD.css';

interface DriveContact {
  id: string;
  name: string;
  distanceLabel: string;
  distanceRaw: number;
  radioActive: boolean;
}

interface BroadcastContact {
  def: RadioBroadcastDef;
  distanceLabel: string;
  distanceRaw: number;
  inRadioRange: boolean;
}

interface HailOffer {
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

const ACCEPT_BODIES = [
  (name: string) => `Channel open. Go ahead.\n\n— ${name}`,
  (name: string) => `Copy. Standing by.\n\n— ${name}`,
  (name: string) => `Received. You're clear to transmit.\n\n— ${name}`,
];

const REJECT_BODIES = [
  (name: string) => `Not receiving traffic. Stand off.\n\n— ${name}`,
  (name: string) => `No.\n\n— ${name}`,
  (name: string) => `Channel closed.\n\n— ${name}`,
];

function sendHailContact(id: string, name: string) {
  setHailStatus(id, 'pending');

  addMessage({
    id: `hail-out-${id}`,
    from: 'COMMS SYSTEM',
    subject: `HAIL TRANSMITTED — ${name}`,
    body: `Outgoing hail sent on open channel.\nAwaiting response from ${name}.`,
    platform: 'OPENLINE',
  });

  const delayMs = 4000 + Math.random() * 8000;
  const accepted = Math.random() < 0.7;
  const pool = accepted ? ACCEPT_BODIES : REJECT_BODIES;
  const body = pool[Math.floor(Math.random() * pool.length)](name);

  queueMessage(
    {
      id: `hail-resp-${id}`,
      from: name,
      subject: accepted ? 'HAIL RESPONSE — CHANNEL OPEN' : 'HAIL RESPONSE — DECLINED',
      body,
      platform: 'OPENLINE',
    },
    delayMs
  );

  setTimeout(() => {
    setHailStatus(id, accepted ? 'accepted' : 'rejected');
  }, delayMs);
}

export const commsStatus = {
  pending: '◈ HAIL PENDING',
  accepted: '● COMMS ESTABLISHED',
  rejected: '✕ HAIL DECLINED',
  none: '○ OUT OF RADIO RANGE',
  radioActive: '● RADIO ACTIVE',
  incoming: '⊛ INCOMING HAIL',
};

function driveStatusLine(hs: HailStatus, radioActive: boolean): string {
  if (hs === 'pending') return commsStatus.pending;
  if (hs === 'accepted') return commsStatus.accepted;
  if (hs === 'rejected') return commsStatus.rejected;
  return radioActive ? commsStatus.radioActive : commsStatus.none;
}

function driveStatusPulse(hs: HailStatus, radioActive: boolean): boolean {
  if (hs === 'pending') return true;
  if (hs === 'none') return radioActive;
  return false;
}

export default function ContactsHUD() {
  const [open, setOpen] = useState(false);
  const [chatShipId, setChatShipId] = useState<string | null>(null);
  const [inRangeDrives, setInRangeDrives] = useState<DriveContact[]>([]);
  const [broadcastContacts, setBroadcastContacts] = useState<BroadcastContact[]>([]);
  const [hailStates, setHailStates] = useState<Map<string, HailStatus>>(new Map());
  const [incomingHails, setIncomingHails] = useState<Set<string>>(new Set());
  const [savedContactIds, setSavedContactIds] = useState<Set<string>>(new Set());
  const [hailOffers, setHailOffers] = useState<Map<string, HailOffer>>(new Map());
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());

  const prevSigRef = useRef('');
  const prevBcastSigRef = useRef('');
  const fuelStationHailFiredRef = useRef(false);
  const tmpVec = useRef(new THREE.Vector3());
  const bcastVec = useRef(new THREE.Vector3());

  // rAF loop: detect drive-signature ships and compute broadcast station distances
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const ship = shipPosRef.current;

      // Drive signatures
      if (driveSignatureOnRef.current) {
        const range = driveSignatureRangeRef.current;
        const sigs = getDriveSignatures();
        const inRange: DriveContact[] = [];

        for (const sig of sigs) {
          sig.getPosition(tmpVec.current);
          const dist = tmpVec.current.distanceTo(ship);
          if (dist <= range) {
            const km = dist * KM_PER_UNIT;
            const distLabel =
              km >= 1_000_000
                ? `${(km / 1_000_000).toFixed(2)} Gm`
                : km >= 1_000
                  ? `${(km / 1_000).toFixed(1)} Mm`
                  : `${km.toFixed(0)} km`;
            const radioActive = radioOnRef.current && dist <= radioRangeRef.current;
            inRange.push({
              id: sig.id,
              name: sig.label,
              distanceLabel: distLabel,
              distanceRaw: dist,
              radioActive,
            });
          }
        }

        const sig = inRange
          .map((c) => `${c.id}:${c.radioActive ? 1 : 0}`)
          .sort()
          .join('|');
        if (sig !== prevSigRef.current) {
          prevSigRef.current = sig;
          setInRangeDrives(inRange);
        }
      } else if (prevSigRef.current !== '') {
        prevSigRef.current = '';
        setInRangeDrives([]);
      }

      // Broadcast stations — always tracked, range-gate comms only
      {
        const newBcasts: BroadcastContact[] = [];
        for (const def of RADIO_BROADCAST_DEFS) {
          const collidable = getCollidables().find((c) => c.id === def.id);
          if (collidable) {
            collidable.getWorldPosition(bcastVec.current);
          } else {
            bcastVec.current.set(...def.position);
          }
          const dist = bcastVec.current.distanceTo(ship);

          if (def.id === 'fuel-station' && !fuelStationHailFiredRef.current && dist <= 10000) {
            fuelStationHailFiredRef.current = true;
            setIncomingHail('fuel-station');
            queueMessage(
              {
                id: 'n51744x-hail-incoming',
                from: 'N51744X',
                subject: 'INCOMING HAIL',
                body: 'This is N51744X fuel depot. We have you on approach.\nIdentify your vessel and state your business.\n\n— N51744X COMMS',
                platform: 'OPENLINE',
              },
              2500
            );
          }

          const km = dist * KM_PER_UNIT;
          const distLabel =
            km >= 1_000_000
              ? `${(km / 1_000_000).toFixed(2)} Gm`
              : km >= 1_000
                ? `${(km / 1_000).toFixed(1)} Mm`
                : `${km.toFixed(0)} km`;
          const inRadioRange = radioOnRef.current && dist <= radioRangeRef.current;
          newBcasts.push({ def, distanceLabel: distLabel, distanceRaw: dist, inRadioRange });
        }

        const bcastSig = newBcasts.map((b) => `${b.def.id}:${b.inRadioRange ? 1 : 0}`).join('|');
        if (bcastSig !== prevBcastSigRef.current) {
          prevBcastSigRef.current = bcastSig;
          setBroadcastContacts(newBcasts);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Listen for hail state changes
  useEffect(() => {
    const onHailUpdate = (e: Event) => {
      const { shipId, status } = (e as CustomEvent<{ shipId: string; status: HailStatus }>).detail;
      setHailStates((prev) => new Map(prev).set(shipId, status));
    };
    window.addEventListener('HailStateUpdated', onHailUpdate);
    return () => window.removeEventListener('HailStateUpdated', onHailUpdate);
  }, []);

  // Listen for incoming hail events (NPC-initiated)
  useEffect(() => {
    const onIncoming = (e: Event) => {
      const { id, active } = (e as CustomEvent<IncomingHailEventDetail>).detail;
      setIncomingHails((prev) => {
        const next = new Set(prev);
        if (active) next.add(id);
        else next.delete(id);
        return next;
      });
    };
    window.addEventListener('IncomingHailUpdated', onIncoming);
    return () => window.removeEventListener('IncomingHailUpdated', onIncoming);
  }, []);

  // Handle NPCHailRequest (moved from InboxHUD)
  useEffect(() => {
    const onHailRequest = (e: Event) => {
      const { shipId, type } = (e as CustomEvent<HailOffer>).detail;
      setIncomingHail(shipId);
      setHailOffers((prev) => new Map(prev).set(shipId, { shipId, type }));
    };
    window.addEventListener('NPCHailRequest', onHailRequest);
    return () => window.removeEventListener('NPCHailRequest', onHailRequest);
  }, []);

  // Handle InboxUpdated — re-render message lists and unread indicators
  useEffect(() => {
    const onInboxUpdated = () => setUnreadCount(getUnreadCount());
    window.addEventListener('InboxUpdated', onInboxUpdated);
    return () => window.removeEventListener('InboxUpdated', onInboxUpdated);
  }, []);

  const handleSelect = (id: string) => {
    setChatShipId(id);
    if (incomingHails.has(id)) dismissIncomingHail(id);
    setOpen(false);
  };

  const saveContact = (id: string) => {
    setSavedContactIds((prev) => new Set(prev).add(id));
  };

  function handleAcceptHailOffer(shipId: string) {
    const offer = hailOffers.get(shipId);
    if (offer) {
      // NPCHailRequest case: create inbox message and open it
      const designation = SHIP_DESIGNATIONS[shipId] ?? `VESSEL-${shipId.toUpperCase()}`;
      const typeContent = HAIL_CONTENT[offer.type];
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
            label: offer.type === 'trade' ? 'ACCEPT TRADE' : 'ACCEPT CONTRACT',
            playerText:
              offer.type === 'trade'
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
      markRead(msgId);
      setHailOffers((prev) => {
        const next = new Map(prev);
        next.delete(shipId);
        return next;
      });
      dismissIncomingHail(shipId);
      setChatShipId(null);
    } else {
      // Regular incoming hail: open dialogue tree
      setHailStatus(shipId, 'accepted');
      dismissIncomingHail(shipId);
    }
  }

  // Build contact lists for ContactsHudDialog
  function driveItem(d: DriveContact): SelectionItem {
    const hs = hailStates.get(d.id) ?? 'none';
    const isIncoming = incomingHails.has(d.id);
    return {
      id: d.id,
      label: d.name,
      sublabel: `DRIVE SIG · ${d.distanceLabel}`,
      statusLine: isIncoming ? commsStatus.incoming : driveStatusLine(hs, d.radioActive),
      statusPulse: isIncoming ? true : driveStatusPulse(hs, d.radioActive),
    };
  }

  function broadcastItem(b: BroadcastContact): SelectionItem {
    const isIncoming = incomingHails.has(b.def.id);
    return {
      id: b.def.id,
      label: b.def.label,
      sublabel: `STATION · ${b.distanceLabel}`,
      statusLine: isIncoming
        ? commsStatus.incoming
        : b.inRadioRange
          ? commsStatus.radioActive
          : commsStatus.none,
      statusPulse: isIncoming,
    };
  }

  const savedItems: SelectionItem[] = [
    ...STATIC_CONTACTS.map((c) => {
      const isIncoming = incomingHails.has(c.id);
      const hasUnread =
        !isIncoming &&
        unreadCount > 0 &&
        messageStore.current.some((m) => c.relatedMessageIds.includes(m.id) && !m.read);
      return {
        id: c.id,
        label: c.name,
        sublabel: c.role,
        statusLine: isIncoming ? commsStatus.incoming : undefined,
        statusPulse: isIncoming ? true : undefined,
        statusIcon: hasUnread ? PLATFORM_UI[activePlatform].unreadIcon : undefined,
      };
    }),
    ...inRangeDrives.filter((d) => savedContactIds.has(d.id)).map(driveItem),
    ...broadcastContacts.filter((b) => savedContactIds.has(b.def.id)).map(broadcastItem),
  ];

  const inRangeItems: SelectionItem[] = [
    ...inRangeDrives
      .filter((d) => !savedContactIds.has(d.id))
      .map((d) => ({ ...driveItem(d), saveable: true })),
    ...broadcastContacts
      .filter((b) => !savedContactIds.has(b.def.id))
      .map((b) => ({ ...broadcastItem(b), saveable: true })),
  ];

  const chatShipName = chatShipId
    ? (inRangeDrives.find((d) => d.id === chatShipId)?.name ??
      broadcastContacts.find((b) => b.def.id === chatShipId)?.def.label ??
      chatShipId)
    : '';

  const chatRadioActive = chatShipId
    ? (inRangeDrives.find((d) => d.id === chatShipId)?.radioActive ??
      broadcastContacts.find((b) => b.def.id === chatShipId)?.inRadioRange ??
      false)
    : false;

  function getChatOfferContent(): { header: string; body: string } | undefined {
    if (!chatShipId) return undefined;
    const offer = hailOffers.get(chatShipId);
    if (!offer) return undefined;
    const typeContent = HAIL_CONTENT[offer.type];
    return typeContent[chatShipId] ?? typeContent['0'];
  }

  return (
    <>
      <div className="contacts-hud-wrapper">
        <button
          className={`contacts-hud-btn${inRangeDrives.length > 0 ? ' contacts-hud-btn--active' : ''}`}
          onClick={() => setOpen(true)}
          title="Open contacts"
        >
          <span className="contacts-hud-icon" aria-hidden>
            ⊙
          </span>
          <span className="contacts-hud-label">CONTACTS</span>
          {inRangeDrives.length > 0 && (
            <span className="contacts-hud-badge">{inRangeDrives.length}</span>
          )}
          {incomingHails.size > 0 && (
            <span className="contacts-hud-badge contacts-hud-badge--incoming">!</span>
          )}
        </button>
      </div>

      {open && (
        <ContactsHudDialog
          title="CONTACTS"
          savedItems={savedItems}
          inRangeItems={inRangeItems}
          onSave={saveContact}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      )}

      {/* Comms chat — handles both static contacts (inbox mode) and live ships */}
      {chatShipId &&
        (() => {
          const staticContact = STATIC_CONTACTS.find((c) => c.id === chatShipId);
          if (staticContact) {
            return (
              <CommsChat
                shipId={chatShipId}
                shipName={staticContact.name}
                staticContact={staticContact}
                onClose={() => setChatShipId(null)}
              />
            );
          }
          return (
            <CommsChat
              shipId={chatShipId}
              shipName={chatShipName}
              hailStatus={hailStates.get(chatShipId) ?? 'none'}
              radioActive={chatRadioActive}
              incomingHail={incomingHails.has(chatShipId)}
              hailOfferContent={getChatOfferContent()}
              onHail={() => sendHailContact(chatShipId, chatShipName)}
              onAcceptHail={() => handleAcceptHailOffer(chatShipId)}
              onDeclineHail={() => {
                dismissIncomingHail(chatShipId);
                setChatShipId(null);
              }}
              onClose={() => setChatShipId(null)}
            />
          );
        })()}
    </>
  );
}
