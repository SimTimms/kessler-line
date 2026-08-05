import { useState, useEffect, useRef } from 'react';
import {
  getThread,
  createThread,
  addChatMessage,
  setChatTurn,
  type ChatThread,
} from '../../context/ChatStore';
import {
  getOrAssignDialogueTree,
  getOrAssignCaptainName,
  resolveDialogueText,
} from '../../narrative/npcDialogues';
import { getOrCreateShipRecord, addContactEvent } from '../../narrative/shipRegistry';
import type { HailStatus } from '../../context/HailState';
import DialogueThread from './DialogueThread';
import './CommsChat.css';
import { getRadioBroadcasts, resolveRadioDialogueTreeId } from '../../context/RadioBroadcastRegistry';
import type { StaticContact } from '../../narrative/contacts';
import type { MessagePlatform } from '../../context/MessageStore';
import { RADIO_COMMS_PLATFORM } from '../../config/commsConfig';
import { acceptShipRendezvous, hasShipRendezvous } from '../../context/RendezvousState';

interface CommsChatProps {
  shipId: string;
  shipName: string;
  onClose: () => void;
  hailStatus?: HailStatus;
  radioActive?: boolean;
  /** Messaging client skin for the comms panel (REACH = cyan, OPENLINE = orange). */
  platform?: MessagePlatform;
  /** Show accept/decline hail prompt (incoming or re-offer while still broadcasting). */
  showHailPrompt?: boolean;
  hailOfferContent?: { header: string; body: string };
  onHail?: () => void;
  onAcceptHail?: () => void;
  onDeclineHail?: () => void;
  canRequestDockPermission?: boolean;
  isDockPermissionGranted?: boolean;
  onRequestDockPermission?: () => boolean;
  isSavedContact?: boolean;
  onAddToContacts?: () => void;
  staticContact?: StaticContact;
  onBack?: () => void;
}

export default function CommsChat({
  shipId,
  shipName,
  onClose,
  hailStatus,
  radioActive,
  showHailPrompt = false,
  hailOfferContent,
  platform = RADIO_COMMS_PLATFORM,
  onHail,
  onAcceptHail,
  onDeclineHail,
  canRequestDockPermission = false,
  isDockPermissionGranted = false,
  onRequestDockPermission,
  isSavedContact = false,
  onAddToContacts,
  staticContact,
  onBack,
}: CommsChatProps) {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const closedRef = useRef(false);
  const threadInitRef = useRef(false);

  const effectiveHailStatus: HailStatus = hailStatus ?? 'accepted';
  const isRadioActive = radioActive ?? true;

  // Sync from store whenever ChatUpdated fires for this ship
  useEffect(() => {
    if (staticContact) return;
    const onUpdate = (e: Event) => {
      const { shipId: sid } = (e as CustomEvent<{ shipId: string }>).detail;
      if (sid === shipId) {
        const t = getThread(shipId);
        if (t) setThread({ ...t, messages: [...t.messages] });
      }
    };
    window.addEventListener('ChatUpdated', onUpdate);
    return () => window.removeEventListener('ChatUpdated', onUpdate);
  }, [shipId, staticContact]);

  // Initialise thread only when hail is accepted
  useEffect(() => {
    if (staticContact) return;

    let t = getThread(shipId);
    if (t) {
      setThread({ ...t, messages: [...t.messages] });
      return;
    }

    const status = hailStatus ?? 'accepted';
    if (status !== 'accepted') return;
    if (threadInitRef.current) return;
    threadInitRef.current = true;

    if (!t) {
      const record = getOrCreateShipRecord(shipId, shipName);
      const tree = getOrAssignDialogueTree(shipId, record);
      t = createThread(
        shipId,
        tree.vesselName || shipName,
        tree.captainName || getOrAssignCaptainName(shipId),
        tree.id,
        tree.openingTurnId
      );

      const firstTurn = tree.turns[tree.openingTurnId];
      if (firstTurn) {
        const delay = 1200 + Math.random() * 1800;
        const openingText = resolveDialogueText(firstTurn.npcText, record);
        setTimeout(() => {
          addChatMessage(shipId, {
            id: `npc-${shipId}-open`,
            role: 'npc',
            text: openingText,
            timestamp: Date.now(),
          });
          setChatTurn(shipId, tree.openingTurnId, false);
        }, delay);
      }
    }
    setThread({ ...t, messages: [...t.messages] });
  }, [shipId, shipName, hailStatus, staticContact]);

  // Log a contact event when the conversation ends
  useEffect(() => {
    if (staticContact || !thread || closedRef.current) return;
    const ended =
      thread.currentTurnId === null && !thread.awaitingNpc && thread.messages.length > 0;
    if (ended) {
      closedRef.current = true;
      addContactEvent(shipId, `Channel closed. ${thread.messages.length} messages exchanged.`);
    }
  }, [thread?.currentTurnId, thread?.awaitingNpc, thread?.messages.length, shipId, staticContact]);

  // ── Dialogue tree (handles pre-hail and accepted states) ─────────────────────
  const tree = !staticContact && thread ? getOrAssignDialogueTree(shipId) : null;
  const currentTurn = thread?.currentTurnId && tree ? tree.turns[thread.currentTurnId] : null;
  const showOptions =
    !!thread &&
    !thread.awaitingNpc &&
    currentTurn !== null &&
    (currentTurn?.playerOptions.length ?? 0) > 0;
  const isEnded = !!thread && thread.currentTurnId === null && !thread.awaitingNpc;
  const canRequestRendezvous = !staticContact && effectiveHailStatus === 'accepted';
  const isRendezvousActive = hasShipRendezvous(shipId);
  const canRequestDock = !staticContact && effectiveHailStatus === 'accepted' && canRequestDockPermission;

  const handleOption = (optionId: string) => {
    if (!thread) return;
    const dialogueTree = getOrAssignDialogueTree(shipId);
    const record = getOrCreateShipRecord(shipId, shipName);
    const activeTurn = thread.currentTurnId ? dialogueTree.turns[thread.currentTurnId] : null;
    if (!activeTurn) return;

    const option = activeTurn.playerOptions.find((o) => o.id === optionId);
    if (!option) return;

    addChatMessage(shipId, {
      id: `player-${shipId}-${optionId}-${Date.now()}`,
      role: 'player',
      text: resolveDialogueText(option.text, record),
      timestamp: Date.now(),
    });

    setChatTurn(shipId, option.nextTurnId, option.nextTurnId !== null);

    if (option.nextTurnId !== null) {
      const nextTurn = dialogueTree.turns[option.nextTurnId];
      if (nextTurn) {
        const delay = 2000 + Math.random() * 3000;
        const npcText = resolveDialogueText(nextTurn.npcText, record);
        setTimeout(() => {
          addChatMessage(shipId, {
            id: `npc-${shipId}-${option.nextTurnId}-${Date.now()}`,
            role: 'npc',
            text: npcText,
            timestamp: Date.now(),
          });
          const isTerminal = nextTurn.playerOptions.length === 0;
          setChatTurn(shipId, isTerminal ? null : option.nextTurnId!, false);
        }, delay);
      }
    }
  };

  const handleRequestRendezvous = () => {
    if (staticContact || isRendezvousActive) return;
    const now = Date.now();
    addChatMessage(shipId, {
      id: `player-${shipId}-request-rendezvous-${now}`,
      role: 'player',
      text: 'Request rendezvous. Cut thrust and hold steady for docking approach.',
      timestamp: now,
    });
    addChatMessage(shipId, {
      id: `npc-${shipId}-accept-rendezvous-${now}`,
      role: 'npc',
      text: 'Rendezvous acknowledged. Engines idle. Maintaining heading for your approach. You are cleared to dock.',
      timestamp: now + 1,
    });
    acceptShipRendezvous(shipId);
  };

  const handleRequestDockPermission = () => {
    if (staticContact || !canRequestDock || isDockPermissionGranted) return;
    const now = Date.now();
    addChatMessage(shipId, {
      id: `player-${shipId}-request-dock-permission-${now}`,
      role: 'player',
      text: 'Request dock permission. Holding approach over your landing pad.',
      timestamp: now,
    });
    const accepted = onRequestDockPermission?.() ?? false;
    addChatMessage(shipId, {
      id: `npc-${shipId}-dock-permission-response-${now}`,
      role: 'npc',
      text: accepted
        ? 'Dock request approved. You are cleared to dock on this approach.'
        : 'Dock request denied. Hold position and try again later.',
      timestamp: now + 1,
    });
  };

  const isBroadcastContact = getRadioBroadcasts().some(
    (e) => e.id === shipId && resolveRadioDialogueTreeId(e)
  );

  // Force a single comms skin across all channels.
  const uiPlatform: MessagePlatform = RADIO_COMMS_PLATFORM;

  return (
    <DialogueThread
      shipId={shipId}
      shipName={shipName}
      contact={staticContact}
      hideShipProfile={isBroadcastContact}
      commsPlatform={uiPlatform}
      effectiveHailStatus={effectiveHailStatus}
      showHailPrompt={showHailPrompt}
      isRadioActive={isRadioActive}
      hailOfferContent={hailOfferContent}
      onHail={onHail}
      onAcceptHail={onAcceptHail}
      onDeclineHail={onDeclineHail}
      isSavedContact={isSavedContact}
      onAddToContacts={onAddToContacts}
      thread={thread}
      playerOptions={currentTurn?.playerOptions ?? []}
      showOptions={showOptions}
      isEnded={isEnded}
      onOption={handleOption}
      canRequestRendezvous={canRequestRendezvous}
      isRendezvousActive={isRendezvousActive}
      onRequestRendezvous={handleRequestRendezvous}
      canRequestDockPermission={canRequestDock}
      isDockPermissionGranted={isDockPermissionGranted}
      onRequestDockPermission={handleRequestDockPermission}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
