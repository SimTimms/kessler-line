// Static contact definitions — always available in the contacts list
// regardless of proximity or scanner state.

export interface StaticContact {
  id: string;
  name: string;
  role: string;
  platform: string;
  /** IDs of inbox messages that belong to this contact */
  relatedMessageIds: string[];
}

export const STATIC_CONTACTS: StaticContact[] = [
  {
    id: 'outer-lanes-dispatch',
    name: 'Outer Lanes Ltd.',
    role: 'EMPLOYER · CARGO ROUTING',
    platform: 'REACH',
    relatedMessageIds: [
      'dispatch-intro-1',
      'dispatch-reply-ack',
      'dispatch-reply-query',
      'dispatch-reply-sirix',
    ],
  },
  {
    id: 'family-earth',
    name: 'Home — Earth',
    role: 'PERSONAL · DEGRADED RELAY',
    platform: 'BROADCAST',
    relatedMessageIds: ['family-earth-1'],
  },
  {
    id: 'neptune-control',
    name: 'Neptune Control',
    role: 'TRAFFIC AUTHORITY · RESTRICTED',
    platform: 'REACH',
    relatedMessageIds: ['neptune-control-1'],
  },
];
