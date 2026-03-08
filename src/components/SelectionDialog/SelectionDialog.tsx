import { useEffect, useRef } from 'react';
import { playDialogOpen, playDialogSelect } from '../../context/SoundManager';
import './SelectionDialog.css';

export interface SelectionItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface SelectionDialogProps {
  title: string;
  items: SelectionItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function SelectionDialog({ title, items, selectedId, onSelect, onClose }: SelectionDialogProps) {
  const soundFired = useRef(false);
  useEffect(() => {
    if (!soundFired.current) {
      soundFired.current = true;
      playDialogOpen();
    }
  }, []);

  return (
    <div className="sd-backdrop" onClick={onClose}>
      <div className="sd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sd-title">{title}</div>
        <div className="sd-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sd-item${item.id === selectedId ? ' sd-item--active' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // prevent global click listener double-fire
                playDialogSelect();
                onSelect(item.id);
                onClose();
              }}
            >
              <span className="sd-item-label">{item.label}</span>
              {item.sublabel && <span className="sd-item-sublabel">{item.sublabel}</span>}
            </button>
          ))}
        </div>
        <button className="sd-close" onClick={onClose}>✕ CLOSE</button>
      </div>
    </div>
  );
}
