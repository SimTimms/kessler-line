import { assignDialogueTree, getDialogueTreeById } from './npcDialogues';
import { getThread, createThread, addChatMessage, setChatTurn } from '../context/ChatStore';
import { dockContactThreadId } from '../config/dockConfig';
import { setIncomingHail } from '../context/IncomingHailState';

export interface NarrativeHailParams {
  /** Unique contact ID for the hail (used as ChatThread key). */
  contactId: string;
  /** Dialogue tree ID from npcDialogues.ts. */
  dialogueTreeId: string;
  /** Display name of the ship/station (e.g. "Donington Station"). */
  shipName: string;
  /** Captain/NPC name (e.g. "Elias Voss"). */
  captainName: string;
  /** Optional dock history to copy. If provided, copies messages from the dock thread. */
  dockHistory?: {
    dockId: string;
    contactId: string;
  };
}

/**
 * Fire an incoming narrative hail from any character.
 * Pre-creates the chat thread seeded with optional dock conversation history
 * so the player sees continuity when they accept the hail.
 */
export function fireNarrativeHail(params: NarrativeHailParams): void {
  const { contactId, dialogueTreeId, shipName, captainName, dockHistory } = params;

  // Assign the narrative dialogue tree before the hail fires
  assignDialogueTree(contactId, dialogueTreeId);

  const tree = getDialogueTreeById(dialogueTreeId);
  if (tree) {
    // Pre-create the chat thread so CommsChat finds it with history + opening message
    createThread(
      contactId,
      tree.vesselName || shipName,
      tree.captainName || captainName,
      dialogueTreeId,
      tree.openingTurnId,
    );

    // Copy any previous dock conversation as history
    if (dockHistory) {
      const dockThreadId = dockContactThreadId(dockHistory.dockId, dockHistory.contactId);
      const dockThread = getThread(dockThreadId);
      if (dockThread) {
        for (const msg of dockThread.messages) {
          addChatMessage(contactId, { ...msg, id: `history-${msg.id}` });
        }
      }
    }

    // Add the opening NPC message from the new dialogue
    const firstTurn = tree.turns[tree.openingTurnId];
    if (firstTurn) {
      addChatMessage(contactId, {
        id: `npc-${contactId}-open`,
        role: 'npc',
        text: firstTurn.npcText,
        timestamp: Date.now(),
      });
      setChatTurn(contactId, tree.openingTurnId, false);
    }
  }

  setIncomingHail(contactId);
}
