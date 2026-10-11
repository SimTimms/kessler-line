import {
  DOCK_ROLE_LABELS,
  dockContactThreadId,
  dockJobThreadId,
  hasPendingDockDialogue,
} from '../../../../config/dockConfig';
import { getDockContacts, getDockJobs } from '../../../../context/DockablePartnerStore';
import {
  activeMissionRef,
  completedMissionsRef,
  declinedMissionsRef,
} from '../../../../context/MissionState';
import type { DirectoryContactItem } from './dockTransferTypes';

/**
 * Builds the station panel's directory: the dock's contacts followed by any
 * job-board postings that carry a dialogue tree. Contacts are flagged CALLING
 * when they have an unoffered mission or unread follow-up dialogue.
 */
export function buildDockDirectory(partnerId: string): DirectoryContactItem[] {
  const contacts: DirectoryContactItem[] = getDockContacts(partnerId).map((c) => {
    const missionId = c.missionId;
    const threadId = dockContactThreadId(partnerId, c.id);
    const missionAvailable = missionId != null && missionId.length > 0;
    const hasFollowUp = hasPendingDockDialogue(threadId, c.dialogue);
    return {
      threadId,
      name: c.name,
      role: DOCK_ROLE_LABELS[c.role],
      portrait: c.portrait,
      missionFlag: missionAvailable || hasFollowUp ? 'CALLING' : undefined,
    };
  });

  const jobs: DirectoryContactItem[] = getDockJobs(partnerId)
    .filter((j) => j.dialogue)
    .map((j) => ({
      threadId: dockJobThreadId(partnerId, j.id),
      name: j.title,
      role: 'JOB BOARD',
    }));

  return [...contacts, ...jobs];
}
