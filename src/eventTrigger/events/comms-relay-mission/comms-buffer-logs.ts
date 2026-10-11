// Intercepted emergency communications stored in the comms buffer satellite.
// Delivered to the player's inbox when the comms relay mission completes.

import type { InboxMessage } from '../../../context/MessageStore';

/** Generate a random alphanumeric ship relay ID, e.g. "RLY-7K3F". */
function randomRelayId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `RLY-${id}`;
}

function buildLogs(): Omit<InboxMessage, 'read' | 'timestamp'>[] {
  return [
    {
      id: 'buffer-log-luna-broadcast',
      from: `${randomRelayId()} — Luna Gateway`,
      subject: 'EMERGENCY BROADCAST — EARTH EVENT',
      body:
        'PRIORITY ONE — ALL STATIONS\n\n'
        + 'This is Luna Gateway broadcasting on all emergency channels.\n\n'
        + 'At 0342 UTC we observed a large-scale surface event across the Eastern Seaboard '
        + 'and Western Europe. Atmospheric readings indicate significant debris ejection into '
        + 'low orbit. All ground-based uplinks from those regions have gone silent.\n\n'
        + 'We have lost telemetry from Baikonur, Kourou, and Cape Canaveral. '
        + 'Orbital stations report visual confirmation of widespread fires visible from LEO.\n\n'
        + 'Cause is unknown. We are declaring a system-wide emergency.\n\n'
        + 'All vessels are ordered to hold position and conserve resources until further notice.\n\n'
        + '— Luna Gateway, Emergency Operations',
      platform: 'BROADCAST',
    },
    {
      id: 'buffer-log-penfold-broadcast',
      from: `${randomRelayId()} — USS Penfold`,
      subject: 'EMERGENCY — EARTH CONTACT LOST',
      body:
        'TO ALL STATIONS — USS PENFOLD, REGISTRY FFG-1171\n\n'
        + 'We are currently at anchor in high Mars orbit. '
        + 'As of six hours ago we have received no response from Earth Command on any frequency.\n\n'
        + 'Our last downlink from Norfolk showed [FRAGMENTED] — some kind of seismic cascade '
        + 'across multiple continental plates. Naval Command went dark mid-sentence.\n\n'
        + 'Luna Gateway confirms the event but has no further detail. '
        + 'We are recalling all shore parties and moving to Condition Two.\n\n'
        + 'If any Earth-side station is receiving this, respond on any channel.\n\n'
        + '— Cpt. R. Hargreaves, USS Penfold',
      platform: 'BROADCAST',
    },
    {
      id: 'buffer-log-jupiter-fleet',
      from: `${randomRelayId()} — Jupiter Fleet Command`,
      subject: 'FLEET DIRECTIVE — ALL UNITS',
      body:
        'CLASSIFIED — JUPITER FLEET COMMAND\n\n'
        + 'All units, all stations.\n\n'
        + 'Earth is non-responsive. Relay backbone is collapsing — nodes 3, 4, 5, 8, 11, and 14 '
        + 'confirmed offline. We are operating on local comms only.\n\n'
        + 'Luna Gateway reports catastrophic surface event. Nature and cause remain unknown. '
        + 'Orbital imagery shows debris clouds across the northern hemisphere. '
        + 'Surface temperature readings are inconsistent with any known natural phenomenon.\n\n'
        + 'Effective immediately:\n'
        + '  1. All fleet assets hold current position\n'
        + '  2. Conserve fuel and consumables — resupply timeline unknown\n'
        + '  3. Maintain comms watch on all emergency frequencies\n'
        + '  4. Do not attempt inner-system transit without direct authorisation\n\n'
        + 'We will broadcast updates as information becomes available.\n\n'
        + '— Admiral K. Tanaka, Jupiter Fleet Command',
      platform: 'BROADCAST',
    },
    {
      id: 'buffer-log-corrupted',
      from: `${randomRelayId()} — [UNKNOWN]`,
      subject: '██████ — ██ ███████',
      body:
        '▓▓▓▓ R██EI█ED AT 0█:17 U██\n\n'
        + '...ca█not con██rm survi█ors...\n'
        + '...the en██re coast██ne is...\n'
        + '█████████████████████████\n\n'
        + '...not na██ral. Rep██t: not na██ral...\n'
        + '...some██ing came thr██gh the...\n'
        + '█████████████████████████\n\n'
        + '...if any██ne is ██ceiving...\n'
        + '...god h██p us...\n\n'
        + '[SIGNAL LOST]',
      platform: 'BROADCAST',
    },
  ];
}

export const COMMS_BUFFER_LOGS: Omit<InboxMessage, 'read' | 'timestamp'>[] = buildLogs();
