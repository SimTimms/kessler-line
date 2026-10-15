import { parseDockThreadId, type DockContact } from '../config/dockConfig';
import { getDockContact, getDockJob } from '../context/DockablePartnerStore';
import { deliverTurn, dockTurnDelayMs } from '../narrative/dialogueTurn';
import type { DockDialogueTree } from '../types/dialogueTypes';

export type DockInteriorChat = {
  contact: DockContact;
  dialogue: DockDialogueTree;
};

/**
 * Resolves a dock interior thread id to the contact and dialogue tree behind it.
 * Job board threads have no real contact, so one is synthesised from the job.
 */
export function resolveDockInteriorChat(threadId: string): DockInteriorChat | null {
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
        portrait: '/textures/Image_0.jpg',
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

/**
 * Deliver a dialogue turn into an existing dock thread: the NPC line lands
 * after a short beat, then the player gets that turn's options.
 *
 * `DockInteriorDialogue` only opens a conversation once per mount, so a tree
 * swapped in while the panel is open needs the new turn pushed in from here.
 * Returns false when no thread exists yet — the panel will open the new tree
 * from its opening turn on its own in that case.
 */
export function deliverDockDialogueTurn(
  threadId: string,
  dialogue: DockDialogueTree,
  turnId: string,
  delayMs = dockTurnDelayMs()
): boolean {
  return deliverTurn({
    threadId,
    turns: dialogue.turns,
    turnId,
    treeId: dialogue.id,
    delayMs,
  });
}
