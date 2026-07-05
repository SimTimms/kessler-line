import { useState, useEffect, useRef } from 'react';
import {
  getThread,
  createThread,
  addChatMessage,
  setChatTurn,
  type ChatThread,
} from '../../context/ChatStore';
import { applyDialogueEffects } from '../../narrative/dialogueEffects';
import type { DockContact, DockDialogueTree } from '../../config/dockConfig';
import { speakNpcLine } from '../../sound/PiperTTS';
import DialogueThread from '../CommsChat/DialogueThread';
import '../CommsChat/CommsChat.css';

interface DockInteriorDialogueProps {
  /** ChatStore thread id — typically dockContactThreadId(dockId, contactId). */
  threadId: string;
  contact: DockContact;
  dialogue: DockDialogueTree;
  onClose: () => void;
}

/**
 * Interior comms conversation while docked. Uses the same DialogueThread UI as
 * ship-to-ship comms, driven by an inline dialogue tree from the dock config.
 */
export default function DockInteriorDialogue({
  threadId,
  contact,
  dialogue,
  onClose,
}: DockInteriorDialogueProps) {
  const [thread, setThread] = useState<ChatThread | null>(() => {
    const existing = getThread(threadId);
    return existing ? { ...existing, messages: [...existing.messages] } : null;
  });
  const threadInitRef = useRef(false);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const { shipId: sid } = (e as CustomEvent<{ shipId: string }>).detail;
      if (sid === threadId) {
        const t = getThread(threadId);
        if (t) setThread({ ...t, messages: [...t.messages] });
      }
    };
    window.addEventListener('ChatUpdated', onUpdate);
    return () => window.removeEventListener('ChatUpdated', onUpdate);
  }, [threadId]);

  useEffect(() => {
    if (threadInitRef.current) return;
    threadInitRef.current = true;
    if (getThread(threadId)) return;

    createThread(threadId, contact.name, contact.name, dialogue.id, dialogue.openingTurnId);
    const firstTurn = dialogue.turns[dialogue.openingTurnId];
    if (!firstTurn) return;

    const delay = 700 + Math.random() * 900;
    setTimeout(() => {
      addChatMessage(threadId, {
        id: `npc-${threadId}-open`,
        role: 'npc',
        text: firstTurn.npcText,
        timestamp: Date.now(),
      });
      setChatTurn(threadId, dialogue.openingTurnId, false);
      speakNpcLine(firstTurn.npcText, dialogue.id);
    }, delay);
  }, [threadId, contact, dialogue]);

  const currentTurn = thread?.currentTurnId ? dialogue.turns[thread.currentTurnId] : null;
  const showOptions =
    !!thread &&
    !thread.awaitingNpc &&
    currentTurn !== null &&
    (currentTurn?.playerOptions.length ?? 0) > 0;
  const isEnded = !!thread && thread.currentTurnId === null && !thread.awaitingNpc;

  const handleOption = (optionId: string) => {
    if (!thread) return;
    const activeTurn = thread.currentTurnId ? dialogue.turns[thread.currentTurnId] : null;
    if (!activeTurn) return;
    const option = activeTurn.playerOptions.find((o) => o.id === optionId);
    if (!option) return;

    addChatMessage(threadId, {
      id: `player-${threadId}-${optionId}-${Date.now()}`,
      role: 'player',
      text: option.text,
      timestamp: Date.now(),
    });
    setChatTurn(threadId, option.nextTurnId, true);

    const outcomes = applyDialogueEffects(option.effects).filter((o) => o.text);
    const nextTurn = option.nextTurnId ? dialogue.turns[option.nextTurnId] : null;
    const delay = 900 + Math.random() * 1100;

    setTimeout(() => {
      outcomes.forEach((o, i) => {
        addChatMessage(threadId, {
          id: `fx-${threadId}-${optionId}-${i}-${Date.now()}`,
          role: 'npc',
          text: `» ${o.text}`,
          timestamp: Date.now(),
        });
      });

      if (nextTurn) {
        addChatMessage(threadId, {
          id: `npc-${threadId}-${option.nextTurnId}-${Date.now()}`,
          role: 'npc',
          text: nextTurn.npcText,
          timestamp: Date.now(),
        });
        const isTerminal = nextTurn.playerOptions.length === 0;
        setChatTurn(threadId, isTerminal ? null : option.nextTurnId!, false);
        speakNpcLine(nextTurn.npcText, dialogue.id);
      } else {
        setChatTurn(threadId, null, false);
      }
    }, delay);
  };

  return (
    <DialogueThread
      shipId={threadId}
      shipName={contact.name}
      character={contact}
      hideShipProfile
      commsPlatform={contact.platform ?? 'REACH'}
      effectiveHailStatus="accepted"
      isRadioActive
      showHailPrompt={false}
      thread={thread}
      playerOptions={currentTurn?.playerOptions ?? []}
      showOptions={showOptions}
      isEnded={isEnded}
      onOption={handleOption}
      onClose={onClose}
    />
  );
}