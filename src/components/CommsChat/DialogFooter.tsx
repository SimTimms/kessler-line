import type { InboxMessage } from '../../context/MessageStore';
import type { StaticContact } from '../../narrative/contacts';
import './DialogFooter.css';

interface DialogFooterProps {
  contact: StaticContact | null;
  msgs: InboxMessage[];
  playerOptions: Array<{ id: string; label: string }>;
  showOptions: boolean;
  isPreHail: boolean;
  isEnded: boolean;
  canTransmit?: boolean;
  onClose: () => void;
  onBack?: () => void;
  handleFooterOption: (optionId: string) => void;
  canRequestRendezvous?: boolean;
  isRendezvousActive?: boolean;
  onRequestRendezvous?: () => void;
  canRequestDockPermission?: boolean;
  isDockPermissionGranted?: boolean;
  onRequestDockPermission?: () => void;
}
export default function DialogFooter({
  contact,
  msgs,
  playerOptions,
  showOptions,
  isPreHail,
  isEnded,
  canTransmit = true,
  onClose,
  onBack,
  handleFooterOption,
  canRequestRendezvous = false,
  isRendezvousActive = false,
  onRequestRendezvous,
  canRequestDockPermission = false,
  isDockPermissionGranted = false,
  onRequestDockPermission,
}: DialogFooterProps) {
  return (
    <>
      {!contact && !isPreHail && isEnded && (
        <div className="comms-chat-ended">— TRANSMISSION CLOSED —</div>
      )}
      <div className="comms-chat-footer">
        {!contact && !isPreHail && canRequestDockPermission ? (
          <div className="comms-chat-options">
            <button
              className="comms-chat-close"
              onClick={() => onRequestDockPermission?.()}
              disabled={isDockPermissionGranted}
            >
              {isDockPermissionGranted ? 'DOCK PERMISSION GRANTED' : 'REQUEST DOCK PERMISSION'}
            </button>
          </div>
        ) : null}

        <div className="comms-chat-footer-buttons">
          {onBack && (
            <button className="comms-chat-close" onClick={onBack}>
              BACK
            </button>
          )}
          <button className="comms-chat-close" onClick={onClose}>
            BACK
          </button>
        </div>
      </div>
    </>
  );
}
