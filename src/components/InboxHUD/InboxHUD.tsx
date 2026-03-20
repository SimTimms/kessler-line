import { useState, useEffect, useRef } from 'react';
import { messageStore, markRead, getUnreadCount } from '../../context/MessageStore';
import type { InboxMessage } from '../../context/MessageStore';
import { activePlatform, PLATFORM_UI } from '../../context/ActivePlatform';
import { SelectionDialog } from '../SelectionDialog/SelectionDialog';
import MessageDialog from '../MessageDialog/MessageDialog';
import './InboxHUD.css';

const TRANSIENT_DURATION_MS = 2200;

export default function InboxHUD() {
  const [unread, setUnread] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [activeMessage, setActiveMessage] = useState<InboxMessage | null>(null);
  const [notifVisible, setNotifVisible] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);

  const ui = PLATFORM_UI[activePlatform];

  useEffect(() => {
    const clearHide = () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const showTransient = () => {
      setNotifVisible(true);
      clearHide();
      hideTimeoutRef.current = window.setTimeout(() => {
        setNotifVisible(false);
        hideTimeoutRef.current = null;
      }, TRANSIENT_DURATION_MS);
    };

    const onInboxUpdated = () => {
      setUnread(getUnreadCount());
      setNotifVisible(false);
    };
    const onNpcHail = showTransient;
    const onRadioBeacon = showTransient;
    const onOpenInbox = () => {
      setInboxOpen(true);
      setNotifVisible(false);
    };

    window.addEventListener('InboxUpdated', onInboxUpdated);
    window.addEventListener('NPCHail', onNpcHail);
    window.addEventListener('RadioBeaconClicked', onRadioBeacon);
    window.addEventListener('OpenInbox', onOpenInbox);
    return () => {
      window.removeEventListener('InboxUpdated', onInboxUpdated);
      window.removeEventListener('NPCHail', onNpcHail);
      window.removeEventListener('RadioBeaconClicked', onRadioBeacon);
      window.removeEventListener('OpenInbox', onOpenInbox);
      clearHide();
    };
  }, []);

  if (messageStore.current.length === 0 && !notifVisible) return null;

  const handleSelect = (id: string) => {
    const msg = messageStore.current.find((m) => m.id === id);
    if (msg) {
      markRead(id);
      setActiveMessage(msg);
    }
  };

  return (
    <>
      <button
        className={`inbox-hud-btn${unread > 0 ? ' inbox-hud-btn--unread' : ''}`}
        data-platform={activePlatform}
        onClick={() => setInboxOpen(true)}
        title={`Open ${ui.fullName} messages`}
      >
        <span className="inbox-hud-platform-icon" aria-hidden>
          {ui.icon}
        </span>
        <span className="inbox-hud-platform-name">{ui.name}</span>
        {unread > 0 && <span className="inbox-hud-badge">{unread}</span>}
        {notifVisible && unread === 0 && <span className="inbox-hud-dot" aria-hidden />}
      </button>

      {inboxOpen && (
        <SelectionDialog
          title={ui.inboxTitle}
          platform={activePlatform}
          items={messageStore.current.map((m) => ({
            id: m.id,
            label: m.subject,
            sublabel: m.from,
            statusIcon: m.read ? undefined : ui.unreadIcon,
          }))}
          onSelect={handleSelect}
          onClose={() => setInboxOpen(false)}
        />
      )}

      {activeMessage && (
        <MessageDialog
          message={activeMessage}
          onClose={() => setActiveMessage(null)}
          onMinimize={() => setActiveMessage(null)}
        />
      )}
    </>
  );
}
