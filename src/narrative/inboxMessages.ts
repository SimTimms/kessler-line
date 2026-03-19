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
};

// ── Family ────────────────────────────────────────────────────────────────────

// P3 ECONOMY broadcast fallback — arrived via degraded inner-system relay, destination now unresolvable
export const MSG_FAMILY_EARTH: MessageTemplate = {
  id: 'family-earth-1',
  from: 'Home — Earth, Sector 9',
  subject: 'Still here',
  body: `Power's been stable for three weeks now. The feeds are patchy but we're getting through.\n\nOksana's growing fast. She asks about you.\n\nWe're okay. Come back when you can.\n\n— M`,
  platform: 'BROADCAST',
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
