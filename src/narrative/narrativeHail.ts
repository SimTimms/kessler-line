import { assignDialogueTree, getDialogueTreeById } from './npcDialogues';
import { createThread, addChatMessage, setChatTurn } from '../context/ChatStore';
import { setIncomingHail } from '../context/IncomingHailState';

export interface NarrativeHailParams {
  shipId: string;
  dialogueTreeId: string;
  shipName: string;
  captainName: string;
  personId?: string;
}

export function fireNarrativeHail(params: NarrativeHailParams): void {
  const { shipId, dialogueTreeId, shipName, captainName, personId } = params;

  /** Assign the dialogue tree to the ship. */
  assignDialogueTree(shipId, dialogueTreeId);

  const tree = getDialogueTreeById(dialogueTreeId);
  console.log('dialogueTreeId', tree);

  if (tree) {
    createThread(
      shipId,
      tree.vesselName || shipName,
      tree.captainName || captainName,
      dialogueTreeId,
      tree.openingTurnId,
      personId
    );

    const firstTurn = tree.turns[tree.openingTurnId];
    if (firstTurn) {
      addChatMessage(shipId, {
        id: `npc-${shipId}-open`,
        role: 'npc',
        text: firstTurn.npcText,
        timestamp: Date.now(),
      });
      setChatTurn(shipId, tree.openingTurnId, false);
    }
  }

  setIncomingHail(shipId);
}
