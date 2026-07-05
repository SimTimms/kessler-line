import { useEffect } from 'react';
import { SATURN_STARTER_DIALOGUE_TREE_ID } from '../../narrative/npcDialogues';
import { setIncomingHail } from '../../context/IncomingHailState';

const STARTER_CONTACT_BY_PRESET: Record<string, string> = {
  'mars-low-orbit': 'fleet-mars-1',
  'earth-transfer': 'fleet-earth-1',
  'jupiter-high-orbit': 'fleet-jupiter-1',
  'saturn-approach': 'fleet-saturn-1',
  'neptune-long-haul': 'fleet-neptune-1',
};

export interface StarterHailRequest {
  shipId: string;
  type: 'trade' | 'mission';
  header?: string;
  body?: string;
  dialogueTreeId?: string;
}

interface SandboxStarterMissionProps {
  spawnPresetId: string;
}

/**
 * Fires an authored incoming hail when the sandbox run starts.
 */
export default function SandboxStarterMission({ spawnPresetId }: SandboxStarterMissionProps) {
  useEffect(() => {
    const starterContactId = STARTER_CONTACT_BY_PRESET[spawnPresetId] ?? 'fleet-roamer-1';

    const emitStarterHail = () => {
      // Ensure the contacts/context panel can show this hail even if the
      // request payload listener hasn't mounted yet.
      setIncomingHail(starterContactId);
      const event = new CustomEvent<StarterHailRequest>('NPCHailRequest', {
        detail: {
          shipId: starterContactId,
          type: 'mission',
          dialogueTreeId: SATURN_STARTER_DIALOGUE_TREE_ID,
          header: 'UNSCHEDULED CONTACT — OUTER FLEET',
          body: 'Incoming hail from a nearby fleet unit. They report a missed rendezvous and prolonged radio silence.',
        },
      });
      window.dispatchEvent(event);
    };

    // Send once after startup, then re-broadcast twice in case HUD listeners
    // initialized after the first dispatch.
    const first = window.setTimeout(emitStarterHail, 2500);
    const second = window.setTimeout(emitStarterHail, 6500);
    const third = window.setTimeout(emitStarterHail, 10500);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(third);
    };
  }, [spawnPresetId]);

  return null;
}
