import { useState, useEffect, useRef } from 'react';
import {
  getThread,
  createThread,
  addChatMessage,
  setChatTurn,
  type ChatThread,
} from '../../context/ChatStore';
import { getStationDialogueTree } from '../../narrative/stationDialogues';
import { applyDialogueEffects } from '../../narrative/dialogueEffects';
import type { StationCharacter } from '../../narrative/stationCharacters';
import { speakNpcLine } from '../../sound/PiperTTS';
import DialogueThread from '../CommsChat/DialogueThread';
import '../CommsChat/CommsChat.css';

interface StationDialogueProps {
  character: StationCharacter;
  onClose: () => void;
}

/**
 * Docked conversation with a station-resident NPC. Mirrors CommsChat but is
 * driven by a StationCharacter + station dialogue tree, and runs the effects
 * engine when a player option is chosen.
 */
export default function StationDialogue({ character, onClose }: StationDialogueProps) {
  const shipId = character.id;
  // Resume an existing thread synchronously; new threads arrive via ChatUpdated.
  const [thread, setThread] = useState<ChatThread | null>(() => {
    const existing = getThread(shipId);
    return existing ? { ...existing, messages: [...existing.messages] } : null;
  });
  const threadInitRef = useRef(false);

  // Sync from ChatStore whenever this character's thread updates.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const { shipId: sid } = (e as CustomEvent<{ shipId: string }>).detail;
      if (sid === shipId) {
        const t = getThread(shipId);
        if (t) setThread({ ...t, messages: [...t.messages] });
      }
    };
    window.addEventListener('ChatUpdated', onUpdate);
    return () => window.removeEventListener('ChatUpdated', onUpdate);
  }, [shipId]);

  // Create the thread on first open (resume is handled by the lazy initial state
  // above). createThread/addChatMessage emit ChatUpdated, which the sync effect
  // turns into setThread — so no synchronous setState is needed here.
  useEffect(() => {
    if (threadInitRef.current) return;
    threadInitRef.current = true;
    if (getThread(shipId)) return;

    const tree = getStationDialogueTree(character.dialogueTreeId);
    if (!tree) return;

    createThread(shipId, character.name, character.name, tree.id, tree.openingTurnId);
    const firstTurn = tree.turns[tree.openingTurnId];
    if (!firstTurn) return;

    const delay = 700 + Math.random() * 900;
    setTimeout(() => {
      addChatMessage(shipId, {
        id: `npc-${shipId}-open`,
        role: 'npc',
        text: firstTurn.npcText,
        timestamp: Date.now(),
      });
      setChatTurn(shipId, tree.openingTurnId, false);
      speakNpcLine(firstTurn.npcText, tree.id);
    }, delay);
  }, [shipId, character]);

  const tree = getStationDialogueTree(character.dialogueTreeId) ?? null;
  const currentTurn = thread?.currentTurnId && tree ? tree.turns[thread.currentTurnId] : null;
  const showOptions =
    !!thread &&
    !thread.awaitingNpc &&
    currentTurn !== null &&
    (currentTurn?.playerOptions.length ?? 0) > 0;
  const isEnded = !!thread && thread.currentTurnId === null && !thread.awaitingNpc;

  const handleOption = (optionId: string) => {
    if (!thread || !tree) return;
    const activeTurn = thread.currentTurnId ? tree.turns[thread.currentTurnId] : null;
    if (!activeTurn) return;
    const option = activeTurn.playerOptions.find((o) => o.id === optionId);
    if (!option) return;

    // Player line + hide options while the NPC "responds".
    addChatMessage(shipId, {
      id: `player-${shipId}-${optionId}-${Date.now()}`,
      role: 'player',
      text: option.text,
      timestamp: Date.now(),
    });
    setChatTurn(shipId, option.nextTurnId, true);

    // Apply effects immediately; narrate the outcomes after a beat.
    const outcomes = applyDialogueEffects(option.effects).filter((o) => o.text);
    const nextTurn = option.nextTurnId ? tree.turns[option.nextTurnId] : null;
    const delay = 900 + Math.random() * 1100;

    setTimeout(() => {
      outcomes.forEach((o, i) => {
        addChatMessage(shipId, {
          id: `fx-${shipId}-${optionId}-${i}-${Date.now()}`,
          role: 'npc',
          text: `» ${o.text}`,
          timestamp: Date.now(),
        });
      });

      if (nextTurn) {
        addChatMessage(shipId, {
          id: `npc-${shipId}-${option.nextTurnId}-${Date.now()}`,
          role: 'npc',
          text: nextTurn.npcText,
          timestamp: Date.now(),
        });
        const isTerminal = nextTurn.playerOptions.length === 0;
        setChatTurn(shipId, isTerminal ? null : option.nextTurnId!, false);
        speakNpcLine(nextTurn.npcText, tree.id);
      } else {
        setChatTurn(shipId, null, false);
      }
    }, delay);
  };

  return (
    <DialogueThread
      shipId={shipId}
      shipName={character.name}
      character={character}
      hideShipProfile
      commsPlatform={character.platform ?? 'REACH'}
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
