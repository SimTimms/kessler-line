import { assignDialogueTree, getDialogueTreeById } from './npcDialogues';
import { createThread, addChatMessage, setChatTurn } from '../context/ChatStore';
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
  /**
   * Dock contact id of the person hailing, when they are someone the player can
   * also meet aboard a station. Ties this thread to their identity and history.
   */
  personId?: string;
}

/**
 * Fire an incoming narrative hail from any character.
 *
 * Pass `personId` when the caller is a character the player can also meet at a
 * dock: the panel then resolves that person's portrait, role and dossier and
 * merges their other conversations in as history — see
 * `narrative/contactIdentity.ts` — so no copying is needed here.
 */
export function fireNarrativeHail(params: NarrativeHailParams): void {
  const { contactId, dialogueTreeId, shipName, captainName, personId } = params;

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
      personId
    );

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
