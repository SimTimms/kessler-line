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
import DockInteriorDialogue from '../../Station/StationDialogue';
import ShipCargoSummary from './ShipCargoSummary';
import DockCargoSummary from './DockCargoSummary';
import TransferRow from './TransferRow';
import DerelictMessageView from './DerelictMessageView';
import DerelictThreadView from './DerelictThreadView';
import { buildDockDirectory } from './helpers/dockDirectory';
import type { SelectedLogEntry } from './helpers/dockTransferTypes';
import { getDerelicts, type DerelictRecord } from '../../../context/DerelictStore';
import ContactDossier from '../../CommsChat/ContactDossier';
import '../HelmetHUD/HelmetHUD.css';
import '../../CommsChat/CommsChat.css';
import './DockTransferHUD.css';

const DockTransferHUD = memo(function DockTransferHUD() {
  const [ui, setUi] = useState(getDockTransferUi);
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

          <div className="dock-station-panel__transfers">
            {kinds.length > 0 ? (
              <>
                {kinds.map((kind) => (
                  <TransferRow key={kind} partnerId={partnerId} kind={kind} />
                ))}
              </>
            ) : null}
          </div>

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
          {/* DialogueThread renders its own COMMS OPEN bar while a chat is open. */}
          {dockThreadId && activeDockChat ? null : (
            <div className="dock-station-panel__right-header">
              {selectedLogEntry && isDerelict ? (
                <span className="dock-station-panel__right-title">
                  {selectedLogEntry.kind === 'dossier' ? 'PILOT DOSSIER' : 'COMMS LOG'}
                </span>
              ) : (
                <span className="hud-title">{isDerelict ? 'SHIP PERSONNEL' : 'DIRECTORY'}</span>
              )}
            </div>
          )}

          {dockThreadId && activeDockChat ? (
            <div className="dock-station-panel__dialogue-wrapper">
              <DockInteriorDialogue
                threadId={dockThreadId}
                contact={activeDockChat.contact}
                dialogue={activeDockChat.dialogue}
                inline
                onClose={() => setDockThreadId(null)}
              />
            </div>
          ) : selectedLogEntry && isDerelict && derelictRecord ? (
            selectedLogEntry.kind === 'dossier' ? (
              <div className="dock-station-panel__comms-log-view">
                <ContactDossier data={derelictRecord.pilotDossier} />
                <button
                  type="button"
                  className="dock-station-panel__comms-log-back"
                  onClick={() => setSelectedLogEntry(null)}
                >
                  ◀ BACK
                </button>
              </div>
            ) : selectedLogEntry.kind === 'message' ? (
              <DerelictMessageView
                message={derelictRecord.messages.find((m) => m.id === selectedLogEntry.id)}
                onBack={() => setSelectedLogEntry(null)}
              />
            ) : (
              <DerelictThreadView
                thread={derelictRecord.chatThreads.find(
                  (t) => t.shipId === selectedLogEntry.shipId
                )}
                onBack={() => setSelectedLogEntry(null)}
              />
            )
          ) : directoryItems.length > 0 || (isDerelict && derelictRecord) ? (
            <div className="dock-station-panel__directory">
              {isDerelict && derelictRecord ? (
                <>
                  <button
                    type="button"
                    className="dock-station-panel__contact-item dock-station-panel__contact-item--deceased"
                    onClick={() => setSelectedLogEntry({ kind: 'dossier' })}
                    title="View pilot dossier"
                  >
                    <div className="dock-station-panel__contact-info">
                      <div className="hud-subtitle">{derelictRecord.pilotDossier.name}</div>
                      <div className="dock-station-panel__contact-role">PILOT</div>
                    </div>
                    <span className="dock-station-panel__mission-flag dock-station-panel__mission-flag--deceased">
                      DECEASED
                    </span>
                  </button>
                  {(derelictRecord.chatThreads.length > 0 ||
                    derelictRecord.messages.length > 0) && (
                    <div className="dock-station-panel__comms-log-section">
                      <div className="dock-station-panel__section-label">Comms Log</div>
                      {derelictRecord.chatThreads.map((thread) => (
                        <button
                          key={thread.shipId}
                          type="button"
                          className="dock-station-panel__comms-log-entry"
                          onClick={() =>
                            setSelectedLogEntry({ kind: 'thread', shipId: thread.shipId })
                          }
                          title={`Conversation with ${thread.shipName}`}
                        >
                          <div className="dock-station-panel__comms-log-from">
                            {thread.shipName}
                          </div>
                          <div className="dock-station-panel__comms-log-subject">
                            {thread.messages.length} message
                            {thread.messages.length !== 1 ? 's' : ''}
                          </div>
                        </button>
                      ))}
                      {derelictRecord.messages.map((msg) => (
                        <button
                          key={msg.id}
                          type="button"
                          className="dock-station-panel__comms-log-entry"
                          onClick={() => setSelectedLogEntry({ kind: 'message', id: msg.id })}
                          title={msg.subject}
                        >
                          <div className="dock-station-panel__comms-log-from">{msg.from}</div>
                          <div className="dock-station-panel__comms-log-subject">{msg.subject}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
              {directoryItems.map((item) => (
                <button
                  key={item.threadId}
                  type="button"
                  className="dock-station-panel__contact-item"
                  onClick={() => setDockThreadId(item.threadId)}
                >
                  {item.portrait ? (
                    <img
                      className="dock-station-panel__contact-portrait"
                      src={item.portrait}
                      alt={item.name}
                    />
                  ) : null}
                  <div className="dock-station-panel__contact-info">
                    <div className="hud-subtitle">{item.name}</div>
                    <div className="hud-subtitle-grey">{item.role}</div>
                  </div>
                  {item.missionFlag && (
                    <span className="dock-station-panel__mission-flag">{item.missionFlag}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="dock-station-panel__empty">NO CONTACTS AVAILABLE</div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DockTransferHUD;
