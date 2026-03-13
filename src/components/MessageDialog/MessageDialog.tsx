import type { InboxMessage } from '../../context/MessageStore';
import './MessageDialog.css';

interface MessageDialogProps {
  message: InboxMessage;
  onClose: () => void;
}

export default function MessageDialog({ message, onClose }: MessageDialogProps) {
  const date = new Date(message.timestamp).toISOString().slice(0, 10);

  return (
    <div className="md-backdrop" onClick={onClose}>
      <div className="md-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="md-meta">
          <span className="md-from">FROM: {message.from}</span>
          <span className="md-date">{date}</span>
        </div>
        <div className="md-subject">{message.subject}</div>
        <div className="md-divider" />
        <div className="md-body">{message.body}</div>
        <button className="md-close" onClick={onClose}>✕ CLOSE</button>
      </div>
    </div>
  );
}
