/**
 * CommsRelayMissionController — renders null.
 *
 * 1. Listens for MissionStateChanged — when either prerequisite mission appears
 *    in completedMissionsRef, starts a 20-second timer.
 * 2. After 20s, fires a narrative hail from Elias Voss (emergency broadcast).
 * 3. Monitors ChatUpdated on the hail contact to detect accept/decline.
 * 4. On accept → addActiveMission + push alert.
 * 5. On decline → addDeclinedMission.
 * 6. When the mission appears in completedMissionsRef, delivers buffer log messages.
 * 7. Resupply turn → tops up fuel, O2, and power.
 */

import { useRef, useEffect } from 'react';
import { completedMissionsRef } from '../../../context/MissionState';
import {
  addActiveMission,
  addDeclinedMission,
} from '../../../context/MissionState';
import { getThread, addChatMessage } from '../../../context/ChatStore';
import { pushAlert } from '../../../context/AlertsStore';
import { setFuel, setO2, setPower } from '../../../context/ShipState';
import { fireNarrativeHail } from '../../../narrative/narrativeHail';
import { NARRATIVE_DONINGTON_STATION_ID } from '../../../scenes/NarrativeConfig/narrativeSceneConfig';
import { COMMS_BUFFER_LOGS } from './comms-buffer-logs';
import { preloadBufferData } from '../../../context/CommsBufferStore';
import { dockContactThreadId } from '../../dockConfig';
import {
  COMMS_RELAY_MISSION_ID,
  COMMS_RELAY_HAIL_CONTACT_ID,
  COMMS_RELAY_DIALOGUE_TREE_ID,
  COMMS_BUFFER_SATELLITE_ID,
  // COMMS_RELAY_HAIL_DELAY_MS,        // TODO: re-enable with prerequisite block
  // COMMS_RELAY_PREREQUISITE_MISSIONS, // TODO: re-enable with prerequisite block
} from './comms-relay-config';
import { DEV_COMMS_BUFFER_PANEL_ON_UNDOCK } from '../../debugConfig';
import { EVENT_REQUEST_UNDOCK } from '../../keybindings';
import { syncDockTransferOnDock, clearDockTransferUi } from '../../../context/DockTransferUi';

export default function CommsRelayMissionController() {
  /** True once the hail has been fired (fires at most once per session). */
  const hailFiredRef = useRef(false);
  /** True once mission accept/decline has been processed. */
  const outcomeProcessedRef = useRef(false);
  /** True once the resupply effect has been applied. */
  const resupplyAppliedRef = useRef(false);
  /** True once mission completion logs have been delivered. */
  const logsDeliveredRef = useRef(false);
  /** Timer handle for the 20-second delay. */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── DEBUG: open comms buffer satellite panel after first undock ────────
  // TODO: remove this block before shipping
  const debugPanelOpenRef = useRef(false);
  useEffect(() => {
    if (!DEV_COMMS_BUFFER_PANEL_ON_UNDOCK) return;
    const onUndocked = () => {
      // Small delay so the undock clears first, then open the satellite panel
      setTimeout(() => {
        console.info('[comms-relay] DEBUG: opening Comms Buffer Satellite panel');
        syncDockTransferOnDock(COMMS_BUFFER_SATELLITE_ID);
        debugPanelOpenRef.current = true;
      }, 500);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
    window.addEventListener('ShipUndocked', onUndocked);
    return () => window.removeEventListener('ShipUndocked', onUndocked);
  }, []);

  // ── DEBUG: close the fake panel when undock button is pressed ───────
  useEffect(() => {
    if (!DEV_COMMS_BUFFER_PANEL_ON_UNDOCK) return;
    const onRequestUndock = () => {
      if (!debugPanelOpenRef.current) return;
      debugPanelOpenRef.current = false;
      clearDockTransferUi();
    };
    window.addEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
    return () => window.removeEventListener(EVENT_REQUEST_UNDOCK, onRequestUndock);
  }, []);

  // ── DEBUG: auto-fire hail 10s after mount (bypass prerequisites) ─────
  // TODO: remove this block before shipping
  useEffect(() => {
    if (completedMissionsRef.current.includes(COMMS_RELAY_MISSION_ID)) return;

    const handle = setTimeout(() => {
      if (hailFiredRef.current) return;
      hailFiredRef.current = true;
      console.info('[comms-relay] DEBUG auto-fire hail');
      fireNarrativeHail({
        contactId: COMMS_RELAY_HAIL_CONTACT_ID,
        dialogueTreeId: COMMS_RELAY_DIALOGUE_TREE_ID,
        shipName: 'Donington Station',
        captainName: 'Elias Voss',
        dockHistory: {
          dockId: NARRATIVE_DONINGTON_STATION_ID,
          contactId: 'elias-voss',
        },
      });
    }, 300_000);

    return () => clearTimeout(handle);
  }, []);

  // ── Listen for prerequisite mission completion → start hail timer ──────
  // (currently bypassed by the DEBUG block above — re-enable when done testing)
  /*
  useEffect(() => {
    const onMissionChanged = () => {
      if (hailFiredRef.current) return;

      const hasPrerequisite = COMMS_RELAY_PREREQUISITE_MISSIONS.some((id) =>
        completedMissionsRef.current.includes(id),
      );
      if (!hasPrerequisite) return;

      // Don't fire if the mission is already active, completed, or declined
      // (handles save/load where prerequisite was already done).
      if (completedMissionsRef.current.includes(COMMS_RELAY_MISSION_ID)) return;

      hailFiredRef.current = true;

      timerRef.current = setTimeout(() => {
        fireNarrativeHail({
          contactId: COMMS_RELAY_HAIL_CONTACT_ID,
          dialogueTreeId: COMMS_RELAY_DIALOGUE_TREE_ID,
          shipName: 'Donington Station',
          captainName: 'Elias Voss',
          dockHistory: {
            dockId: NARRATIVE_DONINGTON_STATION_ID,
            contactId: 'elias-voss',
          },
        });
      }, COMMS_RELAY_HAIL_DELAY_MS);
    };

    window.addEventListener('MissionStateChanged', onMissionChanged);
    // Check immediately in case the prerequisite was already completed (e.g. loaded save).
    onMissionChanged();
    return () => {
      window.removeEventListener('MissionStateChanged', onMissionChanged);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  */

  // ── Listen for ChatUpdated to detect accept / decline / resupply ───────
  useEffect(() => {
    const onChatUpdated = (e: Event) => {
      const shipId = (e as CustomEvent<{ shipId: string }>).detail?.shipId;
      if (shipId !== COMMS_RELAY_HAIL_CONTACT_ID) return;

      const thread = getThread(COMMS_RELAY_HAIL_CONTACT_ID);
      if (!thread) return;

      // Resupply — top up fuel, O2, and power when the player reaches the resupply turn.
      if (thread.currentTurnId === 'resupply' && !resupplyAppliedRef.current) {
        resupplyAppliedRef.current = true;
        setFuel(100);
        setO2(100);
        setPower(100);
        pushAlert('Donington Station: fuel, O2, and power restocked.', 'blue');
      }

      if (outcomeProcessedRef.current) return;

      if (thread.currentTurnId === 'accepted') {
        outcomeProcessedRef.current = true;
        addActiveMission(COMMS_RELAY_MISSION_ID);
        pushAlert('New Mission: Comms Buffer Recovery', 'yellow');
      } else if (thread.currentTurnId === 'declined') {
        outcomeProcessedRef.current = true;
        addDeclinedMission(COMMS_RELAY_MISSION_ID);
      }
    };

    window.addEventListener('ChatUpdated', onChatUpdated);
    return () => window.removeEventListener('ChatUpdated', onChatUpdated);
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
        setTimeout(() => {
          const header = `[${log.from}]\n${log.subject}\n\n`;
          addChatMessage(threadId, {
            id: `buffer-playback-${log.id}-${Date.now()}`,
            role: 'npc',
            text: header + log.body,
            timestamp: Date.now(),
          });
        }, baseDelay + i * 1800);
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
