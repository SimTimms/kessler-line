// Intercepted emergency communications stored in the comms buffer satellite.
// Delivered to the player's inbox when the comms relay mission completes.

import type { InboxMessage } from '../../../context/MessageStore';

export const COMMS_BUFFER_LOGS: Omit<InboxMessage, 'read' | 'timestamp'>[] = [
  {
    id: 'buffer-log-distress-01',
    from: 'Unknown Vessel (MV-Ariadne)',
    subject: 'DISTRESS — ENGINE FAILURE',
    body:
      'MAYDAY MAYDAY MAYDAY.\n\nThis is MV-Ariadne, registry TK-4419. Main drive offline. Attitude control failing. We are adrift at coordinates [CORRUPTED] approximately 0.4 AU from Mars.\n\nTwo crew, no injuries. O2 reserves at 38%. Requesting immediate assistance.\n\nRepeating on all frequencies.\n\n— Cpt. Maren Dahl, MV-Ariadne',
    platform: 'BROADCAST',
  },
  {
    id: 'buffer-log-distress-02',
    from: 'Unknown Vessel',
    subject: 'DISTRESS — COLLISION',
    body:
      'Emergency. Hull breach, section 4. Debris impact.\n\nWe are venting atmosphere. Patch holding but won\'t last.\n\nAnyone receiving, we need [SIGNAL LOST]',
    platform: 'BROADCAST',
  },
  {
    id: 'buffer-log-relay-status-01',
    from: 'SolNet Relay Node 7',
    subject: 'RELAY STATUS: DEGRADED',
    body:
      'AUTOMATED STATUS REPORT\n\nNode: SolNet-7 (Mars-Jupiter corridor)\nStatus: DEGRADED\nUplink to SolNet-4: TIMEOUT (72h)\nUplink to SolNet-11: TIMEOUT (72h)\nLocal buffer: ACTIVE\n\nNo upstream handshake in 72 hours. Switching to local cache mode. Queued transmissions will be held until relay link restored.\n\nThis is an automated message.',
    platform: 'BROADCAST',
  },
  {
    id: 'buffer-log-relay-status-02',
    from: 'SolNet Relay Node 3',
    subject: 'RELAY STATUS: OFFLINE',
    body:
      'AUTOMATED STATUS REPORT\n\nNode: SolNet-3 (Earth-Mars corridor)\nStatus: OFFLINE\nLast successful Earth handshake: 6 days ago\nLast successful Mars handshake: 4 hours ago\n\nAll upstream relays non-responsive. Local transmissions only.\n\nWARNING: This node will enter power-save mode in 48 hours if upstream link is not restored.',
    platform: 'BROADCAST',
  },
  {
    id: 'buffer-log-emergency-broadcast',
    from: 'Phobos Control',
    subject: 'EMERGENCY BROADCAST — ALL STATIONS',
    body:
      'PRIORITY ONE — ALL STATIONS\n\nThis is Phobos Control broadcasting on emergency channels.\n\nWe have lost contact with Earth and all inner-system relay nodes. The SolNet backbone appears [FRAGMENTED]\n\n...last confirmed transmission from Lunar Gateway was 5 days ago. Content of that transmission is classified but we can confirm it referenced an [CORRUPTED]\n\nAll vessels are advised to maintain current positions and conserve resources until further notice.\n\nPhobos Control will continue broadcasting updates on this channel.\n\n— Phobos Control, Emergency Operations',
    platform: 'BROADCAST',
  },
  {
    id: 'buffer-log-distress-03',
    from: 'Unknown Vessel (Cargo Hauler)',
    subject: 'DISTRESS — CREW MEDICAL',
    body:
      'This is cargo hauler designation [CORRUPTED], requesting medical assistance. One crew member down — radiation exposure from shielding failure.\n\nWe have basic medical supplies but need a proper facility. Anyone in the Mars vicinity, please respond.\n\nWe can hear you broadcasting but you\'re not hearing us. Comms are one-way only.\n\nPlease. Anyone.',
    platform: 'BROADCAST',
  },
  {
    id: 'buffer-log-system-failure',
    from: 'SolNet Central Operations',
    subject: 'SYSTEM ALERT: CASCADE FAILURE',
    body:
      'CRITICAL SYSTEM ALERT\n\nSolNet Central Operations has detected cascading failures across the relay network.\n\nAffected nodes: 3, 4, 5, 7, 8, 11, 14\nNodes responding: 3 (degraded), 7 (degraded)\nNodes confirmed offline: 4, 5, 8, 11, 14\nNode status unknown: 6, 9, 10, 12, 13\n\nRoot cause: UNKNOWN\nEstimated restoration: UNKNOWN\n\nAll local station operators: switch to direct line-of-sight communications where possible. Do not rely on relay routing.\n\nThis message was generated automatically and may not reach all recipients.',
    platform: 'BROADCAST',
  },
];
