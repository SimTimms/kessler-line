import { useState, useEffect, useRef } from 'react';
import {
  getThread,
  createThread,
  addChatMessage,
  type ChatThread,
} from '../../context/ChatStore';
import { getAssignedDialogueTree } from '../../narrative/npcDialogues';
import {
  chooseDialogueOption,
  deliverTurn,
  radioOpeningDelayMs,
  radioReplyDelayMs,
} from '../../narrative/dialogueTurn';
import type { HailStatus } from '../../context/HailState';
import DialogueThread from './DialogueThread';
import './CommsChat.css';
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
  canReceive?: boolean;
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
  canReceive,
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
  const threadInitRef = useRef(false);

  const effectiveHailStatus: HailStatus = hailStatus ?? 'accepted';
  const isRadioActive = radioActive ?? true;
  const effectiveCanReceive = canReceive ?? true;

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

    // No authored tree pinned to this entity — nothing to say, so no thread.
    // The guard is only set once a tree exists, so one pinned later still opens.
    const tree = getAssignedDialogueTree(shipId);
    if (!tree) return;
    threadInitRef.current = true;

    t = createThread(
      shipId,
      tree.vesselName || shipName,
      tree.captainName || shipName,
      tree.id,
      tree.openingTurnId
    );

    deliverTurn({
      threadId: shipId,
      turns: tree.turns,
      turnId: tree.openingTurnId,
      delayMs: radioOpeningDelayMs(),
    });

    setThread({ ...t, messages: [...t.messages] });
  }, [shipId, shipName, hailStatus, staticContact]);

  // ── Dialogue tree (handles pre-hail and accepted states) ─────────────────────
  const tree = !staticContact && thread ? getAssignedDialogueTree(shipId) : null;
  const currentTurn = thread?.currentTurnId && tree ? tree.turns[thread.currentTurnId] : null;
  const showOptions =
    !!thread &&
    !thread.awaitingNpc &&
    currentTurn !== null &&
    (currentTurn?.playerOptions.length ?? 0) > 0;
  const isEnded = !!thread && thread.currentTurnId === null && !thread.awaitingNpc;
  const canRequestRendezvous = !staticContact && effectiveHailStatus === 'accepted';
  const isRendezvousActive = hasShipRendezvous(shipId);
  const canRequestDock =
    !staticContact && effectiveHailStatus === 'accepted' && canRequestDockPermission;

  const handleOption = (optionId: string) => {
    if (!thread || !tree) return;
    chooseDialogueOption({
      threadId: shipId,
      turns: tree.turns,
      currentTurnId: thread.currentTurnId,
      optionId,
      delayMs: radioReplyDelayMs(),
    });
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

  // Force a single comms skin across all channels.
  const uiPlatform: MessagePlatform = RADIO_COMMS_PLATFORM;

  return (
    <DialogueThread
      shipId={shipId}
      shipName={shipName}
      contact={staticContact}
      commsPlatform={uiPlatform}
      effectiveHailStatus={effectiveHailStatus}
      showHailPrompt={showHailPrompt}
      isRadioActive={isRadioActive}
      canReceive={effectiveCanReceive}
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
