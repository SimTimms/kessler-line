import type { InboxMessage } from '../../../context/MessageStore';

interface DerelictMessageViewProps {
  message: InboxMessage | undefined;
  onBack: () => void;
}

export default function DerelictMessageView({ message, onBack }: DerelictMessageViewProps) {
  if (!message) {
    return (
      <div className="dock-station-panel__directory">
        <div className="dock-station-panel__empty">Message not found</div>
        <button type="button" className="dock-station-panel__comms-log-back" onClick={onBack}>
          ◀ BACK
        </button>
      </div>
    );
  }

  return (
    <div className="dock-station-panel__comms-log-view">
      <div className="dock-station-panel__comms-log-view-header">
        <div className="dock-station-panel__comms-log-view-from">{message.from}</div>
        <div className="dock-station-panel__comms-log-view-subject">{message.subject}</div>
      </div>
      <div className="dock-station-panel__comms-log-view-body">{message.body}</div>
      <button type="button" className="dock-station-panel__comms-log-back" onClick={onBack}>
        ◀ BACK
      </button>
    </div>
  );
}
