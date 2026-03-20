import { useEffect, useRef } from 'react';
import { playDialogOpen, playDialogSelect } from '../../sound/SoundManager';
import type { MessagePlatform } from '../../context/MessageStore';
import { PLATFORM_UI } from '../../context/ActivePlatform';
import './SelectionDialog.css';

export interface SelectionItem {
  id: string;
  label: string;
  sublabel?: string;
  statusIcon?: string; // platform-specific unread indicator; absent when read
}

interface SelectionDialogProps {
  title: string;
  items: SelectionItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  platform?: string;
}

export function SelectionDialog({ title, items, selectedId, onSelect, onClose, platform }: SelectionDialogProps) {
  const soundFired = useRef(false);
  useEffect(() => {
    if (!soundFired.current) {
      soundFired.current = true;
      playDialogOpen();
    }
  }, []);

  const version = platform ? (PLATFORM_UI[platform as MessagePlatform]?.version ?? '') : '';

  return (
    <div className="sd-backdrop" onClick={onClose}>
      <div className="sd-dialog" data-platform={platform} data-version={version} onClick={(e) => e.stopPropagation()}>
        <div className="sd-title">{title}</div>
        <div className="sd-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sd-item${item.id === selectedId ? ' sd-item--active' : ''}${item.statusIcon ? ' sd-item--unread' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // prevent global click listener double-fire
                playDialogSelect();
                onSelect(item.id);
                onClose();
              }}
            >
              <span className="sd-item-status" aria-hidden>
                {item.statusIcon ?? ''}
              </span>
              <span className="sd-item-content">
                <span className="sd-item-label">{item.label}</span>
                {item.sublabel && <span className="sd-item-sublabel">{item.sublabel}</span>}
              </span>
            </button>
          ))}
        </div>
        <button className="sd-close" onClick={onClose}>✕ CLOSE</button>
      </div>
    </div>
  );
}
