import type { InboxMessage } from '../../context/MessageStore';
import type { StaticContact } from '../../narrative/contacts';

interface DialogFooterProps {
  contact: StaticContact | null;
  msgs: InboxMessage[];
  playerOptions: Array<{ id: string; label: string }>;
  showOptions: boolean;
  isPreHail: boolean;
  isEnded: boolean;
  onClose: () => void;
  onBack?: () => void;
  handleFooterOption: (optionId: string) => void;
  canRequestRendezvous?: boolean;
  isRendezvousActive?: boolean;
  onRequestRendezvous?: () => void;
}
export default function DialogFooter({
  contact,
  msgs,
  playerOptions,
  showOptions,
  isPreHail,
  isEnded,
  onClose,
  onBack,
  handleFooterOption,
  canRequestRendezvous = false,
  isRendezvousActive = false,
  onRequestRendezvous,
}: DialogFooterProps) {
  const pendingReplyMsg = contact ? msgs.find((m) => !m.repliedWith && m.replies?.length) : null;
  const footerOptions = contact
    ? (pendingReplyMsg?.replies ?? []).map((r) => ({ id: r.id, label: r.label }))
    : !isPreHail && showOptions
      ? playerOptions
      : [];

  return (
    <div className="comms-chat-footer">
      {footerOptions.length > 0 && (
        <div className="comms-chat-options">
          {footerOptions.map((opt) => (
            <button
              key={opt.id}
              className="comms-chat-opt"
              onClick={() => handleFooterOption(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {!contact && !isPreHail && canRequestRendezvous && (
        <div className="comms-chat-options">
          <button
            className="comms-chat-opt"
            onClick={() => onRequestRendezvous?.()}
            disabled={isRendezvousActive}
          >
            {isRendezvousActive ? 'RENDEZVOUS CONFIRMED' : 'REQUEST RENDEZVOUS'}
          </button>
        </div>
      )}
      {!contact && !isPreHail && isEnded && (
        <div className="comms-chat-ended">— TRANSMISSION CLOSED —</div>
      )}
      {onBack && (
        <button className="comms-chat-close" onClick={onBack}>
          BACK
        </button>
      )}
      <button className="comms-chat-close" onClick={onClose}>
        CLOSE COMMS
      </button>
    </div>
  );
}
