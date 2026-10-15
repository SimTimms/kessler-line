import { memo, useEffect, useState } from 'react';
import { useFrameUpdate } from '../../../hooks/useFrameUpdate';
import {
  DOCKABLE_PARTNER_CHANGED,
  getDock,
  getDockablePartnerLabel,
  listPartnerResources,
} from '../../../context/DockablePartnerStore';
import { EVENT_REQUEST_UNDOCK } from '../../../config/keybindings';
import { DEFAULT_DOCK_BACKGROUND_IMAGE } from '../../../config/dockConfig';
import { resolveDockInteriorChat } from '../../../utils/dockInteriorChat';
import {
  DOCK_TRANSFER_UI_CHANGED,
  getDockTransferUi,
  minimizeDockTransferPanel,
} from '../../../context/DockTransferUi';
import ShipCargoSummary from './ShipCargoSummary';
import DockCargoSummary from './DockCargoSummary';
import { buildDockDirectory } from './helpers/dockDirectory';
import type { SelectedLogEntry } from './helpers/dockTransferTypes';
import { getDerelicts, type DerelictRecord } from '../../../context/DerelictStore';
import DirectoryPanel from './DirectoryPanel';
import JournalPanel from '../CommsHUD/JournalPanel';
import ResourcesPanel from '../CommsHUD/ResourcesPanel';
import { activeMissionRef } from '../../../context/MissionState';
import SandboxHtmlMiniMap from '../../Minimap/SandboxHtmlMiniMap';
import '../HelmetHUD/HelmetHUD.css';
import '../../CommsChat/CommsChat.css';
import './DockTransferHUD.css';

type DockTransferPanel = 'directory' | 'journal' | 'resources';

const DockTransferHUD = memo(function DockTransferHUD() {
  const [ui, setUi] = useState(getDockTransferUi);
  const [panel, setPanel] = useState<DockTransferPanel>('directory');
  const [dockThreadId, setDockThreadId] = useState<string | null>(null);
  const [, bump] = useState(0);
  const [selectedLogEntry, setSelectedLogEntry] = useState<SelectedLogEntry | null>(null);

  useEffect(() => {
    const onUi = () => {
      const next = getDockTransferUi();
      setUi(next);
      if (!next.partnerId || !next.panelOpen) {
        setDockThreadId(null);
      }
    };
    const onChanged = () => bump((n) => n + 1);

    window.addEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
    window.addEventListener(DOCKABLE_PARTNER_CHANGED, onChanged);
    return () => {
      window.removeEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
      window.removeEventListener(DOCKABLE_PARTNER_CHANGED, onChanged);
    };
  }, []);

  const partnerId = ui.partnerId;
  const panelOpen = ui.panelOpen;

  const isDerelict = partnerId ? partnerId.startsWith('derelict-') : false;
  const derelictRecord: DerelictRecord | undefined = isDerelict
    ? getDerelicts().find((d) => d.id === partnerId)
    : undefined;
  const hasDockInventory = partnerId ? !!getDock(partnerId)?.inventory : false;

  // Re-render so the panel re-reads live store values, but only while it is open.
  useFrameUpdate(() => bump((n) => n + 1), {
    enabled: Boolean(partnerId && panelOpen),
  });

  if (!partnerId || !panelOpen) return null;

  const kinds = listPartnerResources(partnerId);
  const directoryItems = buildDockDirectory(partnerId);

  if (kinds.length === 0 && directoryItems.length === 0 && !isDerelict) return null;

  const label = getDockablePartnerLabel(partnerId);
  const backgroundImage = getDock(partnerId)?.backgroundImage ?? DEFAULT_DOCK_BACKGROUND_IMAGE;
  const towable = ui.towable;

  const activeDockChat = dockThreadId ? resolveDockInteriorChat(dockThreadId) : null;

  return (
    <div className="dock-transfer-hud__background">
      <div className="dock-station-panel helmet-hud">
        {/* ── Left column: station info + transfers + actions ── */}
        <div className="dock-station-panel__left">
          <div
            className="dock-station-panel__hero"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          >
            <span className="dock-station-panel__hero-title">{label}</span>
          </div>
          <SandboxHtmlMiniMap
            showSolarSystem={true}
            showOptions={false}
            fullWidth={true}
            defaultMode="chart"
          />

          <div className="dock-transfer-hud__divider" />
          <div className="dock-station-panel__cargo-summary">
            <ShipCargoSummary />
          </div>

          {(isDerelict || hasDockInventory) && partnerId ? (
            <>
              <div className="dock-transfer-hud__divider" />
              <div className="dock-station-panel__cargo-summary">
                <DockCargoSummary partnerId={partnerId} />
              </div>
            </>
          ) : null}

          <div className="comms-chat-footer">
            <div className="comms-chat-footer-buttons">
              {towable ? (
                <button
                  type="button"
                  className="dock-transfer-hud__btn dock-transfer-hud__btn--wide"
                  onClick={() => {
                    setDockThreadId(null);
                    minimizeDockTransferPanel();
                  }}
                  title="Minimize transfer panel"
                >
                  MINIMIZE
                </button>
              ) : null}
              <button
                type="button"
                className="comms-chat-close"
                onClick={() => window.dispatchEvent(new CustomEvent(EVENT_REQUEST_UNDOCK))}
                title="Undock from current bay"
              >
                UNDOCK
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column: contacts directory / dialogue ── */}
        <div className="dock-station-panel__right">
          <div className="dock-station-panel__right-header">
            <button type="button" className="event-log-tab" onClick={() => setPanel('directory')}>
              DIRECTORY
            </button>
            <button type="button" className="event-log-tab" onClick={() => setPanel('journal')}>
              JOURNAL
              {activeMissionRef.current.length > 0 && (
                <span className="event-log-tab-count event-log-tab-count--active">
                  {activeMissionRef.current.length}
                </span>
              )}
            </button>
            <button type="button" className="event-log-tab" onClick={() => setPanel('resources')}>
              RESOURCES
            </button>
          </div>

          {panel === 'directory' ? (
            <DirectoryPanel
              dockThreadId={dockThreadId}
              activeDockChat={activeDockChat}
              derelictRecord={derelictRecord}
              isDerelict={isDerelict}
              directoryItems={directoryItems}
              setDockThreadId={setDockThreadId}
              selectedLogEntry={selectedLogEntry}
              setSelectedLogEntry={setSelectedLogEntry}
            />
          ) : panel === 'journal' ? (
            <JournalPanel />
          ) : (
            <ResourcesPanel partnerId={partnerId} />
          )}
        </div>
      </div>
    </div>
  );
});

export default DockTransferHUD;
