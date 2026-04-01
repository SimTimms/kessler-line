// All inbox message templates live here.
// To add a new message: define it below and call addMessage() with it from CinematicController or wherever it triggers.

import type { InboxMessage } from '../context/MessageStore';

export type MessageTemplate = Omit<InboxMessage, 'read' | 'timestamp'>;

// ── Dispatch / Outer Lanes Ltd. ───────────────────────────────────────────────

// Mara Voss / Outer Lanes Ltd. — independent outer-system operator on REACH (P2 relay)
export const MSG_DISPATCH_INTRO: MessageTemplate = {
  id: 'dispatch-intro-1',
  from: 'Outer Lanes Ltd. — Routing',
  subject: 'Job #OL-4471',
  body: `Delivery to Sirix Station, Neptune vicinity.\n\nParcel: 1x sealed unit, ref. MX-7734. Handle with care.\n\nDrop and go. Signature not required.\n\n— Mara Voss\nRouting Coordinator, Outer Lanes Ltd.`,
  platform: 'REACH',
  senderLocationId: 'Neptune',
  replies: [
    {
      id: 'dispatch-ack',
      label: 'Acknowledged. En route.',
      playerText: `Job #OL-4471 acknowledged. Parcel MX-7734 confirmed in hold.\n\nProceeding to Sirix Station, Neptune vicinity. ETA dependent on corridor clearance.\n\n— Pilot, Independent`,
      npcResponse: {
        id: 'dispatch-reply-ack',
        from: 'Outer Lanes Ltd. — Routing',
        subject: 'Re: Job #OL-4471',
        body: `Good. Don't dawdle — the Sirix window is narrow and I can't extend your clearance if you miss it.\n\nMX-7734 is time-sensitive. Move.\n\n— M.V.`,
        platform: 'REACH',
      },
    },
    {
      id: 'dispatch-query-contents',
      label: "Query: what's in MX-7734?",
      playerText: `Routing query — MX-7734 is listed as sealed, no contents declaration on my manifest copy. If Neptune Traffic asks, what am I carrying?\n\n— Pilot, Independent`,
      npcResponse: {
        id: 'dispatch-reply-query',
        from: 'Outer Lanes Ltd. — Routing',
        subject: 'Re: Job #OL-4471',
        body: `Contents are proprietary cargo. Outer Lanes is cleared through Neptune Traffic — that clearance covers your manifest.\n\nYou're being paid to deliver, not to know. Keep moving.\n\n— M.V.`,
        platform: 'REACH',
      },
    },
    {
      id: 'dispatch-sirix-checkin',
      label: 'Sirix flagging missed check-in.',
      playerText: `Heads up — BEACON is flagging a missed automated check-in for Sirix Station. Status shows unknown.\n\nWant me to verify before final approach?\n\n— Pilot, Independent`,
      npcResponse: {
        id: 'dispatch-reply-sirix',
        from: 'Outer Lanes Ltd. — Routing',
        subject: 'Re: Job #OL-4471',
        body: `Automated systems miss check-ins. Sirix is active.\n\nComplete the delivery. If there's no one to receive, leave it at the dock terminal and log the drop.\n\nDon't deviate.\n\n— M.V.`,
        platform: 'REACH',
      },
    },
  ],
};

// ── Family ────────────────────────────────────────────────────────────────────

// P3 ECONOMY broadcast fallback — arrived via degraded inner-system relay, destination now unresolvable
export const MSG_FAMILY_EARTH: MessageTemplate = {
  id: 'family-earth-1',
  from: 'Home — Earth, Sector 9',
  subject: 'Still here',
  body: `Power's been stable for three weeks now. The feeds are patchy but we're getting through.\n\nOksana's growing fast. She asks about you.\n\nWe're okay. Come back when you can.\n\n— M`,
  audioFile: 'https://kessler-audio.s3.eu-west-2.amazonaws.com/family-earth-1.mp3',
  audioVoice: 'Marcela',
  platform: 'BROADCAST',
  senderLocationId: 'Earth',
  replies: [
    {
      id: 'family-reply-okay',
      label: "I'm okay — near Neptune.",
      playerText: `I'm okay. Running a courier job in the Neptune corridor. Quiet out here.\n\nTell Oksana I'll bring something back.\n\nMiss you both. I'll make it back soon.`,
      deliveryNote: `RELAY FAILED — INNER SYSTEM DESTINATION UNRESOLVABLE\nMessage held in outgoing queue. No delivery window available.`,
    },
    {
      id: 'family-reply-coming-back',
      label: "Tell Oksana I'll be back.",
      playerText: `Tell Oksana I'm coming home. It's going to take a while — the lanes are complicated right now — but I'm coming.\n\nKeep the power stable and stay where you are.\n\nI love you.`,
      deliveryNote: `RELAY FAILED — INNER SYSTEM DESTINATION UNRESOLVABLE\nMessage held in outgoing queue. No delivery window available.`,
    },
    {
      id: 'family-reply-hang-on',
      label: 'Hang on. On my way.',
      playerText: `We're okay out here. The feeds are patchy on this end too.\n\nI'm going to work my way back in. Stay where you are — don't try to move.\n\nI love you both. I'm coming.`,
      deliveryNote: `RELAY FAILED — INNER SYSTEM DESTINATION UNRESOLVABLE\nMessage held in outgoing queue. No delivery window available.`,
    },
  ],
};

// ── Authorities ───────────────────────────────────────────────────────────────

// Neptune Control broadcasts on Layer 3 / BEACON — REACH P2
export const MSG_NEPTUNE_CONTROL: MessageTemplate = {
  id: 'neptune-control-1',
  from: 'Neptune Control — Traffic Authority',
  subject: 'Approach Corridor Closed',
  body: `Vessel, you have entered a restricted approach corridor.\n\nNo-fly zone is active. All docking rights for the inner ring are suspended pending security review.\n\nReverse thrust immediately and hold at minimum 20,000 units from the planet surface. Failure to comply will be treated as a hostile approach.\n\nNEPTUNE CONTROL OUT.`,
  platform: 'REACH',
};

// ── Employer / Dispatch ───────────────────────────────────────────────────────

// DISPATCH sends on HERALD with a verified P0 sender credential (Trunk access suspended post-cascade)
export const MSG_EMPLOYER_RECALL: MessageTemplate = {
  id: 'employer-recall-1',
  from: '— DISPATCH',
  subject: '⚠ PRIORITY-1 — ABORT APPROACH',
  body: `Stop.\n\nDo not attempt Neptune entry. The corridor is locked and your window is gone.\n\nReturn to Asteroid Dock. Now.\n\nDo not contact Neptune Control. Do not respond to hails.\n\nThis is not a request.`,
  platform: 'HERALD',
};
