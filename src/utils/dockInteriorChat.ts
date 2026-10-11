import { parseDockThreadId, type DockContact } from '../config/dockConfig';
import { getDockContact, getDockJob } from '../context/DockablePartnerStore';
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
