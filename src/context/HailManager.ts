import {
  type HailStatus,
  setHailStatus,
  markHailDeclined,
} from './HailState';
import { dismissIncomingHail } from './IncomingHailState';
import {
  getRadioBroadcasts,
  isRadioHailEnabled,
  resolveRadioDialogueTreeId,
} from './RadioBroadcastRegistry';
import { addMessage, queueMessage, markRead } from './MessageStore';
import { getDock } from './DockablePartnerStore';
import { assignDialogueTree, SATURN_STARTER_DIALOGUE_TREE_ID } from '../narrative/npcDialogues';
import { getSettlementByObjectId } from './SettlementTracker';
import { getSettlementHailPreview } from '../narrative/settlementRadio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HailOffer {
  shipId: string;
  type: 'trade' | 'mission';
  header?: string;
  body?: string;
  dialogueTreeId?: string;
}

export interface BroadcastContactSlim {
  id: string;
  distanceRaw: number;
  inRadioRange: boolean;
  hailRange?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SHIP_DESIGNATIONS: Record<string, string> = {
  '0': 'HEKTOR-7',
  'fleet-mars-1': 'RN-11 RED DUSK',
  'fleet-earth-1': 'RN-08 HALCYON',
  'fleet-jupiter-1': 'RN-22 AURORA KNIFE',
  'fleet-saturn-1': 'RN-14 NIGHTGLASS',
  'fleet-neptune-1': 'RN-31 GREYWATER',
  'fleet-roamer-1': 'RN-03 FARLINE',
};

export const STARTER_FLEET_CONTACT_IDS = new Set([
  'fleet-mars-1',
  'fleet-earth-1',
  'fleet-jupiter-1',
  'fleet-saturn-1',
  'fleet-neptune-1',
  'fleet-roamer-1',
]);

export const HAIL_CONTENT: Record<
  'trade' | 'mission',
  Record<string, { header: string; body: string }>
> = {
  trade: {
    '0': {
      header: 'SURPLUS CARGO — FUEL CELLS',
      body: "We're carrying more fuel cells than we need and they're eating into our margins. Half price if you take them now. We don't need the credits as much as we need the cargo space.",
    },
  },
  mission: {
    '0': {
      header: 'ESCORT CONTRACT',
      body: "Our drive is cycling wrong — diagnostics point to a thermal regulator but we can't fix it out here. Three days to the station at reduced thrust. We just need another ship in proximity while we limp in. Standard rate on arrival.",
    },
    'fleet-mars-1': {
      header: 'UNSCHEDULED CONTACT — FLEET CHECK',
      body: "Hey, this is fleet recon. Not much out here. We've had no contact for days now. We were expecting a rendezvous and got complete radio silence. Have you had any contact?",
    },
    'fleet-earth-1': {
      header: 'UNSCHEDULED CONTACT — FLEET CHECK',
      body: "Hey, this is fleet recon. Not much out here. We've had no contact for days now. We were expecting a rendezvous and got complete radio silence. Have you had any contact?",
    },
    'fleet-jupiter-1': {
      header: 'UNSCHEDULED CONTACT — FLEET CHECK',
      body: "Hey, this is fleet recon. Not much out here. We've had no contact for days now. We were expecting a rendezvous and got complete radio silence. Have you had any contact?",
    },
    'fleet-saturn-1': {
      header: 'UNSCHEDULED CONTACT — FLEET CHECK',
      body: "Hey, this is fleet recon. Not much out here. We've had no contact for days now. We were expecting a rendezvous and got complete radio silence. Have you had any contact?",
    },
    'fleet-neptune-1': {
      header: 'UNSCHEDULED CONTACT — FLEET CHECK',
      body: "Hey, this is fleet recon. Not much out here. We've had no contact for days now. We were expecting a rendezvous and got complete radio silence. Have you had any contact?",
    },
    'fleet-roamer-1': {
      header: 'UNSCHEDULED CONTACT — FLEET CHECK',
      body: "Hey, this is fleet recon. Not much out here. We've had no contact for days now. We were expecting a rendezvous and got complete radio silence. Have you had any contact?",
    },
  },
};

const ACCEPT_BODIES = [
  (name: string) => `Channel open. Go ahead.\n\n— ${name}`,
  (name: string) => `Copy. Standing by.\n\n— ${name}`,
  (name: string) => `Received. You're clear to transmit.\n\n— ${name}`,
];

const REJECT_BODIES = [
  (name: string) => `Not receiving traffic. Stand off.\n\n— ${name}`,
  (name: string) => `No.\n\n— ${name}`,
  (name: string) => `Channel closed.\n\n— ${name}`,
];

export const commsStatus = {
  pending: '◈ HAIL PENDING',
  accepted: '● COMMS ESTABLISHED',
  rejected: '✕ HAIL DECLINED',
  none: '○ OUT OF RADIO RANGE',
  radioActive: '● RADIO ACTIVE',
  receiving: '◎ RECEIVING',
  incoming: '⊛ INCOMING HAIL',
};

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

export function clampChance(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value as number));
}

export function getHailAcceptanceChance(contactId: string): number {
  const dock = getDock(contactId);
  if (dock) {
    return clampChance(dock.hailAcceptanceChance, 0.7);
  }
  return 0.7;
}

export function driveStatusLine(hs: HailStatus, radioActive: boolean, inPassiveRange = false): string {
  if (hs === 'pending') return commsStatus.pending;
  if (hs === 'accepted') return commsStatus.accepted;
  if (hs === 'rejected') return commsStatus.rejected;
  if (radioActive) return commsStatus.radioActive;
  if (inPassiveRange) return commsStatus.receiving;
  return commsStatus.none;
}

export function driveStatusPulse(hs: HailStatus, radioActive: boolean): boolean {
  if (hs === 'pending') return true;
  if (hs === 'none') return radioActive;
  return false;
}

// ---------------------------------------------------------------------------
// Decision functions
// ---------------------------------------------------------------------------

export function isBroadcastHailEligible(
  shipId: string,
  broadcastContacts: BroadcastContactSlim[],
): boolean {
  const b = broadcastContacts.find((x) => x.id === shipId);
  if (!b?.hailRange) return false;
  const entry = getRadioBroadcasts().find((e) => e.id === shipId);
  if (!entry || !resolveRadioDialogueTreeId(entry)) return false;
  if (!isRadioHailEnabled(entry)) return false;
  return b.inRadioRange && b.distanceRaw <= b.hailRange;
}

export function shouldShowHailPrompt(
  shipId: string,
  incomingHails: Set<string>,
  broadcastContacts: BroadcastContactSlim[],
  hailStates: Map<string, HailStatus>,
  getThread: (id: string) => unknown,
): boolean {
  // Incoming hails ALWAYS show the prompt — this is the bug fix.
  // Previously, the thread check came first and blocked narrative hails
  // that pre-create threads for conversation history bridging.
  if (incomingHails.has(shipId)) return true;
  if (getThread(shipId)) return false;
  const status = hailStates.get(shipId) ?? 'none';
  if (status === 'accepted') return false;
  return isBroadcastHailEligible(shipId, broadcastContacts);
}

export function getChatOfferContent(
  chatShipId: string,
  hailOffers: Map<string, HailOffer>,
): { header: string; body: string } | undefined {
  const offer = hailOffers.get(chatShipId);
  if (offer) {
    const typeContent = HAIL_CONTENT[offer.type];
    const fallback = typeContent[chatShipId] ?? typeContent['0'];
    return {
      header: offer.header ?? fallback.header,
      body: offer.body ?? fallback.body,
    };
  }
  const settlement = getSettlementByObjectId(chatShipId);
  if (settlement) {
    return getSettlementHailPreview(settlement);
  }
  if (STARTER_FLEET_CONTACT_IDS.has(chatShipId)) {
    const fallback = HAIL_CONTENT.mission[chatShipId] ?? HAIL_CONTENT.mission['fleet-roamer-1'];
    return fallback;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Side-effect functions
// ---------------------------------------------------------------------------

export function sendHailContact(id: string, name: string): void {
  setHailStatus(id, 'pending');

  addMessage({
    id: `hail-out-${id}`,
    from: 'COMMS SYSTEM',
    subject: `HAIL TRANSMITTED — ${name}`,
    body: `Outgoing hail sent on open channel.\nAwaiting response from ${name}.`,
    platform: 'OPENLINE',
  });

  const delayMs = 4000 + Math.random() * 8000;
  const accepted = Math.random() < getHailAcceptanceChance(id);
  const pool = accepted ? ACCEPT_BODIES : REJECT_BODIES;
  const body = pool[Math.floor(Math.random() * pool.length)](name);

  queueMessage(
    {
      id: `hail-resp-${id}`,
      from: name,
      subject: accepted ? 'HAIL RESPONSE — CHANNEL OPEN' : 'HAIL RESPONSE — DECLINED',
      body,
      platform: 'OPENLINE',
    },
    delayMs
  );

  setTimeout(() => {
    setHailStatus(id, accepted ? 'accepted' : 'rejected');
  }, delayMs);
}

export function acceptHailOffer(
  shipId: string,
  offer: HailOffer | undefined,
): { clearOffer: boolean; closeChatPanel: boolean } {
  if (offer) {
    if (offer.dialogueTreeId) {
      assignDialogueTree(shipId, offer.dialogueTreeId);
      setHailStatus(shipId, 'accepted');
      dismissIncomingHail(shipId);
      return { clearOffer: true, closeChatPanel: false };
    }

    const designation = SHIP_DESIGNATIONS[shipId] ?? `VESSEL-${shipId.toUpperCase()}`;
    const typeContent = HAIL_CONTENT[offer.type];
    const content = {
      header: offer.header ?? (typeContent[shipId] ?? typeContent['0']).header,
      body: offer.body ?? (typeContent[shipId] ?? typeContent['0']).body,
    };
    const msgId = `npc-hail-${shipId}-${Date.now()}`;
    addMessage({
      id: msgId,
      from: designation,
      subject: content.header,
      body: content.body,
      platform: 'OPENLINE',
      replies: [
        {
          id: 'accept',
          label: offer.type === 'trade' ? 'ACCEPT TRADE' : 'ACCEPT CONTRACT',
          playerText:
            offer.type === 'trade'
              ? 'Deal. Transferring credits now.'
              : 'Copy that. Matching your heading, maintaining proximity.',
        },
        {
          id: 'decline',
          label: 'DECLINE',
          playerText: 'Not interested. Good luck out there.',
        },
      ],
    });
    markRead(msgId);
    dismissIncomingHail(shipId);
    return { clearOffer: true, closeChatPanel: true };
  }

  // No offer — resolve from fleet or broadcast registry
  if (STARTER_FLEET_CONTACT_IDS.has(shipId)) {
    assignDialogueTree(shipId, SATURN_STARTER_DIALOGUE_TREE_ID);
    setHailStatus(shipId, 'accepted');
    dismissIncomingHail(shipId);
    return { clearOffer: false, closeChatPanel: false };
  }

  const entry = getRadioBroadcasts().find((e) => e.id === shipId);
  const treeId = entry ? resolveRadioDialogueTreeId(entry) : undefined;
  if (treeId) {
    assignDialogueTree(shipId, treeId);
  }
  setHailStatus(shipId, 'accepted');
  dismissIncomingHail(shipId);
  return { clearOffer: false, closeChatPanel: false };
}

export function declineHailOffer(shipId: string): void {
  markHailDeclined(shipId);
  dismissIncomingHail(shipId);
}
