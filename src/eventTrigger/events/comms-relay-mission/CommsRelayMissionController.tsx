import { useRef, useEffect } from 'react';
import { completedMissionsRef } from '../../../context/MissionState';
import { addChatMessage } from '../../../context/ChatStore';
import { pushAlert } from '../../../context/AlertsStore';
import { COMMS_BUFFER_LOGS } from './comms-buffer-logs';
import { preloadBufferData } from '../../../context/CommsBufferStore';
import { dockContactThreadId } from '../../../config/dockConfig';
import { COMMS_RELAY_MISSION_ID, COMMS_BUFFER_SATELLITE_ID } from './comms-relay-config';
import { DEV_COMMS_BUFFER_PANEL_ON_UNDOCK } from '../../../config/debugConfig';
import { syncDockTransferOnDock } from '../../../context/DockTransferUi';

export default function CommsRelayMissionController() {
  const logsDeliveredRef = useRef(false);

  useEffect(() => {
    if (!DEV_COMMS_BUFFER_PANEL_ON_UNDOCK) return;
    const onUndocked = () => {
      // Small delay so the undock clears first, then open the satellite panel
      setTimeout(() => {
        console.info('[comms-relay] DEBUG: opening Comms Buffer Satellite panel');
        syncDockTransferOnDock(COMMS_BUFFER_SATELLITE_ID);
      }, 500);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
    window.addEventListener('ShipUndocked', onUndocked);
    return () => window.removeEventListener('ShipUndocked', onUndocked);
  }, []);

  // ── Listen for mission completion → play back buffer logs in chat ────────
  useEffect(() => {
    const onMissionChanged = () => {
      if (logsDeliveredRef.current) return;
      if (!completedMissionsRef.current.includes(COMMS_RELAY_MISSION_ID)) return;

      logsDeliveredRef.current = true;
      pushAlert('Mission Complete: Comms Buffer Recovery', 'blue');

      const threadId = dockContactThreadId(COMMS_BUFFER_SATELLITE_ID, 'buffer-system');
      const baseDelay = 1200;

      COMMS_BUFFER_LOGS.forEach((log, i) => {
        setTimeout(
          () => {
            const header = `[${log.from}]\n${log.subject}\n\n`;
            addChatMessage(threadId, {
              id: `buffer-playback-${log.id}-${Date.now()}`,
              role: 'npc',
              text: header + log.body,
              timestamp: Date.now(),
            });
          },
          baseDelay + i * 1800
        );
      });

      // Pre-load the satellite's comms buffer with the log messages so they're
      // visible when the player installs that buffer in their comms buffer slot.
      const now = Date.now();
      preloadBufferData('cb-mrs-412', {
        messages: COMMS_BUFFER_LOGS.map((log, i) => ({
          ...log,
          read: false,
          timestamp: now + i,
        })),
        chatThreads: {},
      });
    };

    window.addEventListener('MissionStateChanged', onMissionChanged);
    // Check immediately in case the mission was already completed (loaded save).
    onMissionChanged();
    return () => window.removeEventListener('MissionStateChanged', onMissionChanged);
  }, []);

  return null;
}
