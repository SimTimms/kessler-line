import DockInteriorDialogue from '../../Station/StationDialogue';
import DerelictMessageView from './DerelictMessageView';
import DerelictThreadView from './DerelictThreadView';
import ContactDossier from '../../CommsChat/ContactDossier';
import type { DockInteriorChat } from '../../../utils/dockInteriorChat';
import type { SelectedLogEntry } from './helpers/dockTransferTypes';
import type { DerelictRecord } from '../../../context/DerelictStore';
import type { DirectoryContactItem } from './helpers/dockTransferTypes';

interface DirectoryPanelProps {
  dockThreadId: string | null;
  activeDockChat: DockInteriorChat | null;
  setDockThreadId: (threadId: string | null) => void;
  selectedLogEntry: SelectedLogEntry | null;
  setSelectedLogEntry: (logEntry: SelectedLogEntry | null) => void;
  derelictRecord: DerelictRecord | null | undefined;
  isDerelict: boolean;
  directoryItems: DirectoryContactItem[];
}

export default function DirectoryPanel({
  dockThreadId,
  activeDockChat,
  setDockThreadId,
  selectedLogEntry,
  setSelectedLogEntry,
  derelictRecord,
  isDerelict,
  directoryItems,
}: DirectoryPanelProps) {
  return dockThreadId && activeDockChat ? (
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
        thread={derelictRecord.chatThreads.find((t) => t.shipId === selectedLogEntry.shipId)}
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
          {(derelictRecord.chatThreads.length > 0 || derelictRecord.messages.length > 0) && (
            <div className="dock-station-panel__comms-log-section">
              <div className="dock-station-panel__section-label">Comms Log</div>
              {derelictRecord.chatThreads.map((thread) => (
                <button
                  key={thread.shipId}
                  type="button"
                  className="dock-station-panel__comms-log-entry"
                  onClick={() => setSelectedLogEntry({ kind: 'thread', shipId: thread.shipId })}
                  title={`Conversation with ${thread.shipName}`}
                >
                  <div className="dock-station-panel__comms-log-from">{thread.shipName}</div>
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
  );
}
