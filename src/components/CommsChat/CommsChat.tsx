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
import { speakNpcLine } from '../../sound/PiperTTS';
import type { HailStatus } from '../../context/HailState';
import DialogueThread from './DialogueThread';
import './CommsChat.css';
import { DIALOGUE_TREES } from '../../narrative/npcDialogues';

interface CommsChatProps {
  shipId: string;
  shipName: string;
  onClose: () => void;
  hailStatus?: HailStatus;
  radioActive?: boolean;
  incomingHail?: boolean;
  hailOfferContent?: { header: string; body: string };
  onHail?: () => void;
  onAcceptHail?: () => void;
  onDeclineHail?: () => void;
  staticContact?: StaticContact;
}

export default function CommsChat({
  shipId,
  shipName,
  onClose,
  hailStatus,
  radioActive,
  incomingHail,
  hailOfferContent,
  onHail,
  onAcceptHail,
  onDeclineHail,
  staticContact,
}: CommsChatProps) {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const closedRef = useRef(false);
  const threadInitRef = useRef(false);

  const effectiveHailStatus: HailStatus = hailStatus ?? 'accepted';
  const isIncoming = incomingHail ?? false;
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

    const status = hailStatus ?? 'accepted';
    if (status !== 'accepted') return;
    if (threadInitRef.current) return;
    threadInitRef.current = true;

    let t = getThread(shipId);
    if (!t) {
      const record = getOrCreateShipRecord(shipId, shipName);
      const tree = getOrAssignDialogueTree(shipId, record);
      t = createThread(
        shipId,
        shipName,
        getOrAssignCaptainName(shipId),
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
          if (tree.audioFile) {
            const audio = new Audio(tree.audioFile);
            audio.play().catch(() => {
              /* autoplay blocked */
            });
          } else {
            speakNpcLine(openingText, tree.id);
          }
        }, delay);
      }
    }
    setThread({ ...t, messages: [...t.messages] });
  }, [shipId, shipName, hailStatus, staticContact]);

  // Initialise thread only when hail is accepted
  useEffect(() => {
    if (!staticContact) return;
    console.log(staticContact.relatedMessageIds[0]);

    const audioFile = DIALOGUE_TREES.find(
      (t) => t.id === staticContact.relatedMessageIds[0]
    )?.audioFile;
    if (audioFile) {
      const audio = new Audio(audioFile);
      audio.play().catch(() => {
        /* autoplay blocked */
      });
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [staticContact]);

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
          setChatTurn(shipId, option.nextTurnId!, false);
          speakNpcLine(npcText, dialogueTree.id);
        }, delay);
      }
    }
  };

  return (
    <DialogueThread
      shipId={shipId}
      shipName={shipName}
      contact={staticContact}
      effectiveHailStatus={effectiveHailStatus}
      isIncoming={isIncoming}
      isRadioActive={isRadioActive}
      hailOfferContent={hailOfferContent}
      onHail={onHail}
      onAcceptHail={onAcceptHail}
      onDeclineHail={onDeclineHail}
      thread={thread}
      playerOptions={currentTurn?.playerOptions ?? []}
      showOptions={showOptions}
      isEnded={isEnded}
      onOption={handleOption}
      onClose={onClose}
    />
  );
}
