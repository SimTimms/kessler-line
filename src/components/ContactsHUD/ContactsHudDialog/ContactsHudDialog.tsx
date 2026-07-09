import { useEffect, useRef } from 'react';
import { playDialogOpen, playDialogSelect } from '../../../sound/SoundManager';
import type { MessagePlatform } from '../../../context/MessageStore';
import { PLATFORM_UI } from '../../../context/ActivePlatform';
import './ContactsHudDialog.css';
import { commsStatus } from '../ContactsHUD';

export interface SelectionItem {
  id: string;
  label: string;
  sublabel?: string;
  avatarSrc?: string;
  avatarAlt?: string;
  statusIcon?: string;
  statusLine?: string;
  statusPulse?: boolean;
  saveable?: boolean;
}

interface ContactsHudDialogProps {
  title: string;
  incomingItems?: SelectionItem[];
  historyItems?: SelectionItem[];
  dockInteriorItems?: SelectionItem[];
  dockInteriorLabel?: string;
  savedItems: SelectionItem[];
  inRangeItems: SelectionItem[];
  onSave: (id: string) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  platform?: string;
}

export function ContactsHudDialog({
  title,
  incomingItems = [],
  historyItems = [],
  dockInteriorItems = [],
  dockInteriorLabel,
  savedItems,
  inRangeItems,
  onSave,
  selectedId,
  onSelect,
  onClose,
  platform,
}: ContactsHudDialogProps) {
  const soundFired = useRef(false);
  useEffect(() => {
    if (!soundFired.current) {
      soundFired.current = true;
      playDialogOpen();
    }
  }, []);

  const version = platform ? (PLATFORM_UI[platform as MessagePlatform]?.version ?? '') : '';

  function itemClass(item: SelectionItem): string {
    const statusClass =
      item.statusLine === commsStatus.incoming
        ? ' chd-item-content--incoming'
        : item.statusLine === commsStatus.rejected
          ? ' chd-item-content--rejected'
          : item.statusLine === commsStatus.radioActive
            ? ' chd-item-content--radio-active'
            : item.statusLine === commsStatus.accepted
              ? ' chd-item-content--accepted'
              : item.statusLine === commsStatus.pending
                ? ' chd-item-content--pending'
                : '';
    return `chd-item${item.id === selectedId ? ' chd-item--active' : ''}${item.statusIcon ? ' chd-item--unread' : ''}${statusClass}`;
  }

  function renderItem(item: SelectionItem, showSave: boolean, isDockInterior = false) {
    return (
      <div key={item.id} className={`chd-item-row${isDockInterior ? ' chd-item-row--docked' : ''}`}>
        <button
          className={itemClass(item)}
          onClick={(e) => {
            e.stopPropagation();
            playDialogSelect();
            onSelect(item.id);
          }}
        >
          {item.avatarSrc ? (
            <img
              className="chd-item-avatar"
              src={item.avatarSrc}
              alt={item.avatarAlt ?? `${item.label} portrait`}
            />
          ) : null}
          <span className="chd-item-content">
            <span className="chd-item-label">{item.label}</span>
            {item.sublabel && <span className="chd-item-sublabel">{item.sublabel}</span>}
            {item.statusLine && (
              <span
                className={`chd-item-status-line${item.statusPulse ? ' chd-item-status-line--pulse' : ''}`}
              >
                {item.statusLine}
              </span>
            )}
          </span>
        </button>
        {showSave && item.saveable && (
          <button
            className="chd-save-btn"
            title="Save contact"
            onClick={(e) => {
              e.stopPropagation();
              onSave(item.id);
            }}
          >
            [+]
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="chd-backdrop" onClick={onClose}>
      <div
        className="chd-dialog"
        data-platform={platform}
        data-version={version}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chd-title">{title}</div>
        <div className="chd-list">
          {dockInteriorItems.length > 0 && (
            <section className="chd-section chd-section--dock-interior">
              <div className="chd-section-header">
                {dockInteriorLabel ? `ABOARD · ${dockInteriorLabel}` : 'DOCK INTERIOR'}
              </div>
              {dockInteriorItems.map((item) => renderItem(item, false, true))}
            </section>
          )}
          {incomingItems.length > 0 && (
            <section>
              <div className="chd-section-header">INCOMING HAIL</div>
              {incomingItems.map((item) => renderItem(item, false))}
            </section>
          )}
          {historyItems.length > 0 && (
            <section>
              <div className="chd-section-header">HISTORY</div>
              {historyItems.map((item) => renderItem(item, false))}
            </section>
          )}
          {savedItems.length > 0 && (
            <section>
              <div className="chd-section-header">SAVED CONTACTS</div>
              {savedItems.map((item) => renderItem(item, false))}
            </section>
          )}
          {inRangeItems.length > 0 && (
            <section>
              <div className="chd-section-header">IN RANGE</div>
              {inRangeItems.map((item) => renderItem(item, true))}
            </section>
          )}
          {savedItems.length === 0 &&
            inRangeItems.length === 0 &&
            incomingItems.length === 0 &&
            historyItems.length === 0 &&
            dockInteriorItems.length === 0 && (
            <div className="chd-empty">— NO CONTACTS —</div>
          )}
        </div>
        <button className="chd-close" onClick={onClose}>
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
