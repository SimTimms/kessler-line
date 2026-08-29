// Dock configuration for the Comms Buffer Satellite.
// The satellite is unmanned — no fuel/O2, minimal power.
// A single "Buffer System" contact provides the log download dialogue.

import type { DockConfig } from '../../dockConfig';
import type { DialogueEffect } from '../../../narrative/dialogueEffects';
import { COMMS_RELAY_MISSION_ID, COMMS_BUFFER_SATELLITE_LABEL } from './comms-relay-config';

const completeMissionEffect: DialogueEffect = {
  type: 'completeMission',
  missionId: COMMS_RELAY_MISSION_ID,
};

export const COMMS_BUFFER_DOCK_CONFIG: DockConfig = {
  label: COMMS_BUFFER_SATELLITE_LABEL,
  backgroundImage: '/satellite-interior.jpg',
  power: { amount: 12, capacity: 20 },
  contacts: [
    {
      id: 'buffer-system',
      name: 'Communications Buffer',
      role: 'system',
      portrait: '/satellite-interior.jpg',
      bio: 'Automated relay buffer — caches incoming transmissions for retrieval.',
      dialogue: {
        id: 'buffer-system-dialogue',
        openingTurnId: 'status',
        turns: {
          status: {
            id: 'status',
            npcText:
              'COMMS BUFFER NODE ONLINE.\n\nBuffer contains 7 cached transmissions — emergency priority.\nLast received: 4 hours ago.\nRelay link: OFFLINE.\n\nReady for download.',
            playerOptions: [
              {
                id: 'download',
                label: 'DOWNLOAD LOGS',
                text: 'Initiate log transfer.',
                nextTurnId: 'downloading',
                effects: [completeMissionEffect],
              },
              {
                id: 'diagnostics',
                label: 'RUN DIAGNOSTICS',
                text: 'Run a system diagnostic first.',
                nextTurnId: 'diagnostics',
              },
            ],
          },
          downloading: {
            id: 'downloading',
            npcText:
              'TRANSFER COMPLETE.\n\n7 transmissions downloaded to inbox.\n  - 3x distress calls (unknown vessels)\n  - 2x SolNet relay node status\n  - 1x fragmented emergency broadcast\n  - 1x system failure alert\n\nBuffer purged. Relay link remains offline.',
            playerOptions: [],
          },
          diagnostics: {
            id: 'diagnostics',
            npcText:
              'DIAGNOSTIC REPORT:\n\n  Antenna array: NOMINAL\n  Power cells: 62% capacity\n  Buffer storage: 7/512 slots used\n  Relay uplink: NO SIGNAL\n  Last Earth contact: 6 days ago\n  Last relay handshake: 4 hours ago (failed)\n\nUplink failure is not local. Relay network appears non-responsive.',
            playerOptions: [
              {
                id: 'download-after-diag',
                label: 'DOWNLOAD LOGS',
                text: 'Initiate log transfer.',
                nextTurnId: 'downloading',
                effects: [completeMissionEffect],
              },
            ],
          },
        },
      },
    },
  ],
};
