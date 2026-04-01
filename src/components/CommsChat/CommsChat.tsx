import { useState, useEffect, useRef } from 'react';
import {
  getThread,
  createThread,
  addChatMessage,
  setChatTurn,
  type ChatThread,
} from '../../context/ChatStore';
import { getOrAssignDialogueTree, getOrAssignCaptainName, resolveDialogueText } from '../../narrative/npcDialogues';
import {
  getOrCreateShipRecord,
  addContactEvent,
  formatShipClass,
  formatAgenda,
} from '../../narrative/shipRegistry';
import { speakNpcLine } from '../../sound/PiperTTS';
import './CommsChat.css';

interface CommsChatProps {
  shipId: string;
  shipName: string;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function CommsChat({ shipId, shipName, onClose }: CommsChatProps) {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);

  // Sync from store whenever ChatUpdated fires for this ship
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

  // Initialise thread on mount
  useEffect(() => {
    let t = getThread(shipId);
    if (!t) {
      const record = getOrCreateShipRecord(shipId, shipName);
      const tree = getOrAssignDialogueTree(shipId, record);
      t = createThread(shipId, shipName, getOrAssignCaptainName(shipId), tree.id, tree.openingTurnId);

      // Deliver the opening NPC message after a short transmission delay
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
            audio.play().catch(() => {/* autoplay blocked */});
          } else {
            speakNpcLine(openingText, tree.id);
          }
        }, delay);
      }
    }
    setThread({ ...t, messages: [...t.messages] });
  }, [shipId, shipName]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages.length]);

  // Log a contact event when the conversation ends
  useEffect(() => {
    if (!thread || closedRef.current) return;
    const ended = thread.currentTurnId === null && !thread.awaitingNpc && thread.messages.length > 0;
    if (ended) {
      closedRef.current = true;
      addContactEvent(shipId, `Channel closed. ${thread.messages.length} messages exchanged.`);
    }
  }, [thread?.currentTurnId, thread?.awaitingNpc, thread?.messages.length, shipId]);

  const handleOption = (optionId: string) => {
    if (!thread) return;
    const tree = getOrAssignDialogueTree(shipId);
    const record = getOrCreateShipRecord(shipId, shipName);
    const currentTurn = thread.currentTurnId ? tree.turns[thread.currentTurnId] : null;
    if (!currentTurn) return;

    const option = currentTurn.playerOptions.find((o) => o.id === optionId);
    if (!option) return;

    // Add player message immediately
    addChatMessage(shipId, {
      id: `player-${shipId}-${optionId}-${Date.now()}`,
      role: 'player',
      text: resolveDialogueText(option.text, record),
      timestamp: Date.now(),
    });

    // Mark awaiting NPC if there's a follow-up turn
    setChatTurn(shipId, option.nextTurnId, option.nextTurnId !== null);

    if (option.nextTurnId !== null) {
      const nextTurn = tree.turns[option.nextTurnId];
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
          speakNpcLine(npcText, tree.id);
        }, delay);
      }
    }
  };

  if (!thread) return null;

  const tree = getOrAssignDialogueTree(shipId);
  const record = getOrCreateShipRecord(shipId, shipName);
  const currentTurn = thread.currentTurnId ? tree.turns[thread.currentTurnId] : null;
  const showOptions = !thread.awaitingNpc && currentTurn && currentTurn.playerOptions.length > 0;
  const isEnded = thread.currentTurnId === null && !thread.awaitingNpc;

  return (
    <div className="comms-chat">
      <div className="comms-chat-header">
        <div className="comms-chat-vessel">{shipName}</div>
        <div className="comms-chat-captain">
          {thread.captainName.toUpperCase()} · OPENLINE
        </div>
        <div className="comms-chat-profile">
          {formatShipClass(record.shipClass)} · {formatAgenda(record.agenda)}
          {record.destination !== 'none' ? ` → ${record.destination.toUpperCase()}` : ''}
          {' · '}{record.faction.toUpperCase()}
        </div>
      </div>

      <div className="comms-chat-messages">
        {thread.messages.length === 0 && thread.awaitingNpc && (
          <div className="comms-chat-connecting">
            <span className="comms-chat-ellipsis">◈ OPENING CHANNEL</span>
          </div>
        )}

        {thread.messages.map((msg) => (
          <div key={msg.id} className={`comms-chat-row comms-chat-row--${msg.role}`}>
            {msg.role === 'npc' && (
              <div className="comms-chat-sender">{thread.captainName}</div>
            )}
            <div className={`comms-chat-bubble comms-chat-bubble--${msg.role}`}>
              {msg.text}
            </div>
            <div className="comms-chat-time">{formatTime(msg.timestamp)}</div>
          </div>
        ))}

        {thread.messages.length > 0 && thread.awaitingNpc && (
          <div className="comms-chat-row comms-chat-row--npc">
            <div className="comms-chat-sender">{thread.captainName}</div>
            <div className="comms-chat-bubble comms-chat-bubble--pending">
              <span className="comms-chat-ellipsis">◈ TRANSMITTING</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="comms-chat-footer">
        {showOptions && (
          <div className="comms-chat-options">
            {currentTurn.playerOptions.map((opt) => (
              <button
                key={opt.id}
                className="comms-chat-opt"
                onClick={() => handleOption(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {isEnded && (
          <div className="comms-chat-ended">— TRANSMISSION CLOSED —</div>
        )}

        <button className="comms-chat-close" onClick={onClose}>
          CLOSE COMMS
        </button>
      </div>
    </div>
  );
}
