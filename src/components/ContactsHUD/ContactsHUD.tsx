import { useState, useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { isWithinRadioRange, isWithinPassiveRadioRange } from '../../context/RadioState';
import { shipPosRef } from '../../context/ShipPos';
import { renderToSimulationSpace } from '../../context/FloatingOrigin';
import {
  messageStore,
  queueMessage,
  getUnreadCount,
} from '../../context/MessageStore';
import { activePlatform, PLATFORM_UI } from '../../context/ActivePlatform';
import { KM_PER_UNIT, RADIO_COMMS_PLATFORM } from '../../config/commsConfig';
import { STATIC_CONTACTS } from '../../narrative/contacts';
import {
  type HailStatus,
  setHailStatus,
  getAllHailStates,
} from '../../context/HailState';
import {
  setIncomingHail,
  getIncomingHails,
  type IncomingHailEventDetail,
} from '../../context/IncomingHailState';
import {
  getRadioBroadcasts,
  type RadioBroadcastEntry,
} from '../../context/RadioBroadcastRegistry';
import { setDriveSignaturesToRadio } from './helpers/setDriveSignaturesToRadio';
import {
  type HailOffer,
  type BroadcastContactSlim,
  SHIP_DESIGNATIONS,
  commsStatus,
  clampChance,
  driveStatusLine,
  driveStatusPulse,
  sendHailContact,
  shouldShowHailPrompt,
  getChatOfferContent,
  acceptHailOffer,
  declineHailOffer,
} from '../../context/HailManager';
import { ContactsHudDialog } from './ContactsHudDialog/ContactsHudDialog';
import type { SelectionItem } from './ContactsHudDialog/ContactsHudDialog';
import CommsChat from '../CommsChat/CommsChat';
import './ContactsHUD.css';

import {
  dockContactThreadId,
  dockJobThreadId,
  DOCK_ROLE_LABELS,
  parseDockThreadId,
  type DockContact,
  type DockDialogueTree,
} from '../../config/dockConfig';
import {
  getDock,
  getDockContact,
  getDockContacts,
  getDockJob,
  getDockJobs,
  hasDockablePartner,
} from '../../context/DockablePartnerStore';
import DockInteriorDialogue from '../Station/StationDialogue';
import { getThread } from '../../context/ChatStore';
import { EVENT_OPEN_COMMS_CONTACT, type OpenCommsContactDetail } from '../../context/CommsUiEvents';
import {
  EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED,
  EVENT_DOCK_PERMISSION_CHANGED,
  getDockPermissionCandidate,
  grantDockPermission,
  hasDockPermission,
  type DockPermissionCandidate,
} from '../../context/DockPermissionState';

export interface DriveContact {
  id: string;
  name: string;
  distanceLabel: string;
  distanceRaw: number;
  radioActive: boolean;
  inPassiveRange: boolean;
}

interface BroadcastContact {
  entry: RadioBroadcastEntry;
  distanceLabel: string;
  distanceRaw: number;
  inRadioRange: boolean;
  inPassiveRange: boolean;
}

// Session-persistent communication history (survives component remounts).
const HISTORICAL_CONTACT_IDS = new Set<string>();

interface ContactsHUDProps {
  /** When true, only in-scene radio registrations and drive contacts (no static inbox contacts). */
  sceneRadioContactsOnly?: boolean;
  /**
   * Custom trigger (e.g. Comms HUD button). When provided, the floating
   * bottom-right button is not rendered.
   */
  children?: (api: ContactsTriggerApi) => ReactNode;
}

export type ContactsTriggerApi = {
  open: () => void;
  contactCount: number;
  hasIncoming: boolean;
  isActive: boolean;
};

function resolveDockInteriorChat(threadId: string): {
  contact: DockContact;
  dialogue: DockDialogueTree;
} | null {
  const parsed = parseDockThreadId(threadId);
  if (!parsed) return null;

  if (parsed.jobId) {
    const job = getDockJob(parsed.dockId, parsed.jobId);
    if (!job?.dialogue) return null;
    return {
      contact: {
        id: parsed.jobId,
        name: job.title,
        role: 'official',
        portrait: '/Image_0.jpg',
        bio: job.summary,
        platform: 'HERALD',
        dialogue: job.dialogue,
      },
      dialogue: job.dialogue,
    };
  }

  if (parsed.contactId) {
    const contact = getDockContact(parsed.dockId, parsed.contactId);
    if (!contact) return null;
    return { contact, dialogue: contact.dialogue };
  }

  return null;
}

export default function ContactsHUD({
  sceneRadioContactsOnly = false,
  children,
}: ContactsHUDProps) {
  const [open, setOpen] = useState(false);
  const [chatShipId, setChatShipId] = useState<string | null>(null);
  const [dockedPartnerId, setDockedPartnerId] = useState<string | null>(null);
  const [inRangeDrives, setInRangeDrives] = useState<DriveContact[]>([]);
  const [broadcastContacts, setBroadcastContacts] = useState<BroadcastContact[]>([]);
  const [hailStates, setHailStates] = useState<Map<string, HailStatus>>(
    () => new Map(Object.entries(getAllHailStates().states))
  );
  const [incomingHails, setIncomingHails] = useState<Set<string>>(
    () => new Set(getIncomingHails())
  );
  const [savedContactIds, setSavedContactIds] = useState<Set<string>>(new Set());
  const [historyContactIds, setHistoryContactIds] = useState<Set<string>>(
    () => new Set(HISTORICAL_CONTACT_IDS)
  );
  const [hailOffers, setHailOffers] = useState<Map<string, HailOffer>>(new Map());
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());
  const [dockPermissionCandidate, setDockPermissionCandidateState] =
    useState<DockPermissionCandidate | null>(() => getDockPermissionCandidate());
  const [, bumpDockPermissionVersion] = useState(0);

  const prevBcastSigRef = useRef('');
  const fuelStationHailFiredRef = useRef(false);
  const bcastVec = useRef(new THREE.Vector3());

  // rAF loop: detect drive-signature ships and compute broadcast station distances
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const ship = shipPosRef.current;

      // Drive signatures
      setDriveSignaturesToRadio({ shipPos: ship, setInRangeDrives: setInRangeDrives });

      // Broadcast stations — only objects that registered in the scene
      {
        const newBcasts: BroadcastContact[] = [];
        for (const entry of getRadioBroadcasts()) {
          entry.getPosition(bcastVec.current);
          renderToSimulationSpace(bcastVec.current, bcastVec.current);
          const dist = bcastVec.current.distanceTo(ship);

          if (
            entry.id === 'fuel-station' &&
            !fuelStationHailFiredRef.current &&
            dist <= 10000 &&
            isWithinPassiveRadioRange(dist)
          ) {
            fuelStationHailFiredRef.current = true;
            setIncomingHail('fuel-station');
            queueMessage(
              {
                id: 'n51744x-hail-incoming',
                from: 'N51744X',
                subject: 'INCOMING HAIL',
                body: 'This is N51744X fuel depot. We have you on approach.\nIdentify your vessel and state your business.\n\n— N51744X COMMS',
                platform: RADIO_COMMS_PLATFORM,
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
          const inRadioRange = isWithinRadioRange(dist);
          const inPassiveRange = isWithinPassiveRadioRange(dist);
          newBcasts.push({ entry, distanceLabel: distLabel, distanceRaw: dist, inRadioRange, inPassiveRange });
        }

        const bcastSig = newBcasts.map((b) => `${b.entry.id}:${b.inRadioRange ? 1 : 0}:${b.inPassiveRange ? 1 : 0}`).join('|');
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

  useEffect(() => {
    const onOpenContactComms = (e: Event) => {
      const detail = (e as CustomEvent<OpenCommsContactDetail>).detail;
      const contactId = detail?.contactId;
      if (!contactId) return;
      rememberContact(contactId);
      setOpen(false);
      setChatShipId(contactId);
    };
    window.addEventListener(EVENT_OPEN_COMMS_CONTACT, onOpenContactComms);
    return () => window.removeEventListener(EVENT_OPEN_COMMS_CONTACT, onOpenContactComms);
  }, []);

  useEffect(() => {
    const onCandidateChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ candidate: DockPermissionCandidate | null }>).detail;
      setDockPermissionCandidateState(detail?.candidate ?? null);
    };
    const onPermissionChanged = () => {
      bumpDockPermissionVersion((v) => v + 1);
    };
    window.addEventListener(EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED, onCandidateChanged);
    window.addEventListener(EVENT_DOCK_PERMISSION_CHANGED, onPermissionChanged);
    return () => {
      window.removeEventListener(EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED, onCandidateChanged);
      window.removeEventListener(EVENT_DOCK_PERMISSION_CHANGED, onPermissionChanged);
    };
  }, []);

  // Track docked partner for interior comms contacts
  useEffect(() => {
    const onDocked = (e: Event) => {
      const id = (e as CustomEvent<{ stationId: string | null }>).detail?.stationId ?? null;
      setDockedPartnerId(hasDockablePartner(id) ? id : null);
    };
    const onUndocked = () => {
      setDockedPartnerId(null);
      setChatShipId((current) => (current && parseDockThreadId(current) ? null : current));
    };
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
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
      const { shipId, type, header, body, dialogueTreeId } = (e as CustomEvent<HailOffer>).detail;
      setIncomingHail(shipId);
      setIncomingHails((prev) => new Set(prev).add(shipId));
      setHailOffers((prev) =>
        new Map(prev).set(shipId, { shipId, type, header, body, dialogueTreeId })
      );
      rememberContact(shipId);
    };
    window.addEventListener('NPCHailRequest', onHailRequest);
    return () => window.removeEventListener('NPCHailRequest', onHailRequest);
  }, []);

  useEffect(() => {
    const onChatUpdate = (e: Event) => {
      const shipId = (e as CustomEvent<{ shipId: string }>).detail?.shipId;
      if (!shipId) return;
      rememberContact(shipId);
    };
    window.addEventListener('ChatUpdated', onChatUpdate);
    return () => window.removeEventListener('ChatUpdated', onChatUpdate);
  }, []);

  // Handle InboxUpdated — re-render message lists and unread indicators
  useEffect(() => {
    const onInboxUpdated = () => setUnreadCount(getUnreadCount());
    window.addEventListener('InboxUpdated', onInboxUpdated);
    return () => window.removeEventListener('InboxUpdated', onInboxUpdated);
  }, []);

  const handleSelect = (id: string) => {
    rememberContact(id);
    setChatShipId(id);
    setOpen(false);
  };

  const saveContact = (id: string) => {
    rememberContact(id);
    setSavedContactIds((prev) => new Set(prev).add(id));
  };

  function rememberContact(id: string) {
    if (!id || parseDockThreadId(id) || STATIC_CONTACTS.some((c) => c.id === id)) return;
    HISTORICAL_CONTACT_IDS.add(id);
    setHistoryContactIds((prev) => new Set(prev).add(id));
  }

  function toBroadcastSlim(contacts: BroadcastContact[]): BroadcastContactSlim[] {
    return contacts.map((b) => ({
      id: b.entry.id,
      distanceRaw: b.distanceRaw,
      inRadioRange: b.inRadioRange,
      hailRange: b.entry.hailRange,
    }));
  }

  function handleAcceptHail(shipId: string) {
    rememberContact(shipId);
    const result = acceptHailOffer(shipId, hailOffers.get(shipId));
    if (result.clearOffer) {
      setHailOffers((prev) => { const next = new Map(prev); next.delete(shipId); return next; });
    }
    if (result.closeChatPanel) {
      setChatShipId(null);
    }
  }

  function handleDeclineHail(shipId: string) {
    rememberContact(shipId);
    declineHailOffer(shipId);
    setChatShipId(null);
  }

  // Build contact lists for ContactsHudDialog
  function driveItem(d: DriveContact): SelectionItem {
    const hs = hailStates.get(d.id) ?? 'none';
    const isIncoming = incomingHails.has(d.id);
    return {
      id: d.id,
      label: d.name,
      sublabel: `DRIVE SIG · ${d.distanceLabel}`,
      statusLine: isIncoming ? commsStatus.incoming : driveStatusLine(hs, d.radioActive, d.inPassiveRange),
      statusPulse: isIncoming ? true : driveStatusPulse(hs, d.radioActive),
    };
  }

  function broadcastItem(b: BroadcastContact): SelectionItem {
    const isIncoming = incomingHails.has(b.entry.id);
    return {
      id: b.entry.id,
      label: b.entry.label,
      sublabel: `STATION · ${b.distanceLabel}`,
      statusLine: isIncoming
        ? commsStatus.incoming
        : b.inRadioRange
          ? commsStatus.radioActive
          : b.inPassiveRange
            ? commsStatus.receiving
            : commsStatus.none,
      statusPulse: isIncoming,
    };
  }

  const staticContactItems: SelectionItem[] = sceneRadioContactsOnly
    ? []
    : STATIC_CONTACTS.map((c) => {
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
      });

  const savedItems: SelectionItem[] = [
    ...staticContactItems,
    ...inRangeDrives.filter((d) => savedContactIds.has(d.id)).map(driveItem),
    ...broadcastContacts.filter((b) => savedContactIds.has(b.entry.id)).map(broadcastItem),
    ...Array.from(savedContactIds)
      .filter(
        (id) =>
          !STATIC_CONTACTS.some((c) => c.id === id) &&
          !inRangeDrives.some((d) => d.id === id) &&
          !broadcastContacts.some((b) => b.entry.id === id)
      )
      .map((id) => {
        const thread = getThread(id);
        return {
          id,
          label: thread?.shipName ?? SHIP_DESIGNATIONS[id] ?? `VESSEL-${id.toUpperCase()}`,
          sublabel: thread ? 'SAVED · LAST KNOWN CONTACT' : 'SAVED · KNOWN CONTACT',
          statusLine: commsStatus.none,
        };
      }),
  ];

  const incomingItems: SelectionItem[] = [
    ...inRangeDrives.filter((d) => incomingHails.has(d.id)).map(driveItem),
    ...broadcastContacts.filter((b) => incomingHails.has(b.entry.id)).map(broadcastItem),
    ...Array.from(incomingHails)
      .filter(
        (id) =>
          !inRangeDrives.some((d) => d.id === id) &&
          !broadcastContacts.some((b) => b.entry.id === id)
      )
      .map((id) => ({
        id,
        label: SHIP_DESIGNATIONS[id] ?? `VESSEL-${id.toUpperCase()}`,
        sublabel: 'UNKNOWN CONTACT · LONG-RANGE HAIL',
        statusLine: commsStatus.incoming,
        statusPulse: true,
      })),
  ];

  const inRangeItems: SelectionItem[] = [
    ...inRangeDrives
      .filter((d) => !savedContactIds.has(d.id) && !incomingHails.has(d.id))
      .map((d) => ({ ...driveItem(d), saveable: true })),
    ...broadcastContacts
      .filter((b) => !savedContactIds.has(b.entry.id) && !incomingHails.has(b.entry.id))
      .map((b) => ({ ...broadcastItem(b), saveable: true })),
  ];

  const historyItems: SelectionItem[] = Array.from(historyContactIds)
    .filter(
      (id) =>
        !incomingHails.has(id) &&
        !savedContactIds.has(id) &&
        !inRangeDrives.some((d) => d.id === id) &&
        !broadcastContacts.some((b) => b.entry.id === id)
    )
    .map((id) => {
      const thread = getThread(id);
      return {
        id,
        label: thread?.shipName ?? SHIP_DESIGNATIONS[id] ?? `VESSEL-${id.toUpperCase()}`,
        sublabel: thread ? 'COMMS LOGGED' : 'CONTACT LOGGED',
        statusLine: thread && thread.currentTurnId === null ? 'LOGGED · CLOSED' : undefined,
      };
    });

  const dockInteriorItems: SelectionItem[] = dockedPartnerId
    ? [
        ...getDockContacts(dockedPartnerId).map((contact) => ({
          id: dockContactThreadId(dockedPartnerId, contact.id),
          label: contact.name,
          sublabel: DOCK_ROLE_LABELS[contact.role],
          avatarSrc: contact.portrait,
          avatarAlt: contact.name,
        })),
        ...getDockJobs(dockedPartnerId)
          .filter((job) => job.dialogue)
          .map((job) => ({
            id: dockJobThreadId(dockedPartnerId, job.id),
            label: job.title,
            sublabel: 'JOB BOARD',
          })),
      ]
    : [];

  const dockInteriorLabel = dockedPartnerId
    ? (getDock(dockedPartnerId)?.label ?? dockedPartnerId)
    : undefined;

  const chatShipName = chatShipId
    ? (resolveDockInteriorChat(chatShipId)?.contact.name ??
      inRangeDrives.find((d) => d.id === chatShipId)?.name ??
      getThread(chatShipId)?.shipName ??
      (hailOffers.has(chatShipId)
        ? (SHIP_DESIGNATIONS[chatShipId] ?? `VESSEL-${chatShipId.toUpperCase()}`)
        : undefined) ??
      broadcastContacts.find((b) => b.entry.id === chatShipId)?.entry.label ??
      chatShipId)
    : '';

  const chatCanReceive = chatShipId
    ? (inRangeDrives.find((d) => d.id === chatShipId)?.inPassiveRange ??
      broadcastContacts.find((b) => b.entry.id === chatShipId)?.inPassiveRange ??
      incomingHails.has(chatShipId))
    : false;

  const chatCanTransmit = chatShipId
    ? (inRangeDrives.find((d) => d.id === chatShipId)?.radioActive ??
      broadcastContacts.find((b) => b.entry.id === chatShipId)?.inRadioRange ??
      incomingHails.has(chatShipId))
    : false;
  const chatDockPermissionGranted = chatShipId ? hasDockPermission(chatShipId) : false;

  function shouldEnableDockPermissionRequest(shipId: string): boolean {
    if (!shipId) return false;
    if (!dockPermissionCandidate) return false;
    return dockPermissionCandidate.stationId === shipId;
  }

  const chatOfferContent = chatShipId ? getChatOfferContent(chatShipId, hailOffers) : undefined;

  const rosterCount = inRangeDrives.length + dockInteriorItems.length;
  const contactsActive = rosterCount > 0;
  const hasIncoming = incomingHails.size > 0;

  return (
    <>
      {children ? (
        children({
          open: () => setOpen(true),
          contactCount: rosterCount,
          hasIncoming,
          isActive: contactsActive,
        })
      ) : (
        <div className="contacts-hud-wrapper">
          <button
            className={`contacts-hud-btn${contactsActive ? ' contacts-hud-btn--active' : ''}`}
            onClick={() => setOpen(true)}
            title="Open contacts"
          >
            <span className="contacts-hud-icon" aria-hidden>
              ⊙
            </span>
            <span className="contacts-hud-label">CONTACTS</span>
            {contactsActive && <span className="contacts-hud-badge">{rosterCount}</span>}
            {hasIncoming && (
              <span className="contacts-hud-badge contacts-hud-badge--incoming">!</span>
            )}
          </button>
        </div>
      )}

      {open && (
        <ContactsHudDialog
          title="CONTACTS"
          dockInteriorItems={dockInteriorItems}
          dockInteriorLabel={dockInteriorLabel}
          incomingItems={incomingItems}
          historyItems={historyItems}
          savedItems={savedItems}
          inRangeItems={inRangeItems}
          onSave={saveContact}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      )}

      {chatShipId &&
        (() => {
          const dockChat = resolveDockInteriorChat(chatShipId);
          if (dockChat) {
            return (
              <DockInteriorDialogue
                threadId={chatShipId}
                contact={dockChat.contact}
                dialogue={dockChat.dialogue}
                onClose={() => setChatShipId(null)}
              />
            );
          }

          const staticContact = STATIC_CONTACTS.find((c) => c.id === chatShipId);
          if (staticContact) {
            return (
              <CommsChat
                shipId={chatShipId}
                shipName={staticContact.name}
                staticContact={staticContact}
                onClose={() => setChatShipId(null)}
                onBack={() => {
                  setChatShipId(null);
                  setOpen(true);
                }}
              />
            );
          }
          return (
            <CommsChat
              shipId={chatShipId}
              shipName={chatShipName}
              platform={RADIO_COMMS_PLATFORM}
              hailStatus={hailStates.get(chatShipId) ?? 'none'}
              radioActive={chatCanTransmit}
              canReceive={chatCanReceive}
              showHailPrompt={shouldShowHailPrompt(chatShipId, incomingHails, toBroadcastSlim(broadcastContacts), hailStates, getThread)}
              hailOfferContent={chatOfferContent}
              onHail={() => sendHailContact(chatShipId, chatShipName)}
              onAcceptHail={() => handleAcceptHail(chatShipId)}
              onDeclineHail={() => handleDeclineHail(chatShipId)}
              canRequestDockPermission={shouldEnableDockPermissionRequest(chatShipId)}
              isDockPermissionGranted={chatDockPermissionGranted}
              onRequestDockPermission={() => {
                const chance = clampChance(getDock(chatShipId)?.dockRequestAcceptanceChance, 0.7);
                const accepted = Math.random() <= chance;
                setHailStatus(chatShipId, 'accepted');
                if (accepted) {
                  grantDockPermission(chatShipId);
                }
                return accepted;
              }}
              isSavedContact={savedContactIds.has(chatShipId)}
              onAddToContacts={() => saveContact(chatShipId)}
              onClose={() => setChatShipId(null)}
              onBack={() => {
                setChatShipId(null);
                setOpen(true);
              }}
            />
          );
        })()}
    </>
  );
}
