import type { ChatThread } from '../../../context/ChatStore';

interface DerelictThreadViewProps {
  thread: ChatThread | undefined;
  onBack: () => void;
}

export default function DerelictThreadView({ thread, onBack }: DerelictThreadViewProps) {
  if (!thread) {
    return (
      <div className="dock-station-panel__directory">
        <div className="dock-station-panel__empty">Thread not found</div>
        <button type="button" className="dock-station-panel__comms-log-back" onClick={onBack}>
          ◀ BACK
        </button>
      </div>
    );
  }

  return (
    <div className="dock-station-panel__comms-log-view">
      <div className="dock-station-panel__comms-log-view-header">
        <div className="dock-station-panel__comms-log-view-from">{thread.shipName}</div>
        <div className="dock-station-panel__comms-log-view-subject">{thread.captainName}</div>
      </div>
      <div className="dock-station-panel__comms-thread-messages">
        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`dock-station-panel__comms-thread-line dock-station-panel__comms-thread-line--${msg.role}`}
          >
            <span className="dock-station-panel__comms-thread-role">
              {msg.role === 'player' ? 'YOU' : thread.captainName}
            </span>
            <span className="dock-station-panel__comms-thread-text">{msg.text}</span>
          </div>
        ))}
      </div>
      <button type="button" className="dock-station-panel__comms-log-back" onClick={onBack}>
        ◀ BACK
      </button>
    </div>
  );
}
