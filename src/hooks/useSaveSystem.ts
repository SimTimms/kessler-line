/**
 * useSaveSystem — wires auto-save and manual save/load into the game loop.
 *
 * - Auto-saves to the 'autosave' slot every AUTOSAVE_INTERVAL_S seconds.
 * - F5  → manual save to slot 'manual'
 * - F9  → load slot 'manual' (falls back to 'autosave')
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { capture, apply } from '../context/SaveManager';
import { saveSlot, loadSlot, AUTOSAVE_SLOT } from '../context/SaveStore';
import { KEY_MANUAL_SAVE, KEY_MANUAL_LOAD } from '../config/keybindings';

const AUTOSAVE_INTERVAL_S = 60;
const MANUAL_SLOT = 'manual';

export interface SaveSystemOptions {
  autosaveSlot?: string;
  manualSlot?: string;
}

export function useSaveSystem(opts?: SaveSystemOptions) {
  const autoSlot = opts?.autosaveSlot ?? AUTOSAVE_SLOT;
  const manSlot = opts?.manualSlot ?? MANUAL_SLOT;
  const timeSinceLastSave = useRef(0);

  // Auto-save on interval
  useFrame((_state, delta) => {
    timeSinceLastSave.current += delta;
    if (timeSinceLastSave.current >= AUTOSAVE_INTERVAL_S) {
      timeSinceLastSave.current = 0;
      saveSlot(autoSlot, 'Autosave', capture());
      window.dispatchEvent(new CustomEvent('autosave'));
      console.debug('[save] autosaved');
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === KEY_MANUAL_SAVE) {
        e.preventDefault();
        saveSlot(manSlot, 'Manual Save', capture());
        window.dispatchEvent(new CustomEvent('autosave'));
        console.info('[save] manual save written');
      }
      if (e.key === KEY_MANUAL_LOAD) {
        e.preventDefault();
        const data = loadSlot(manSlot) ?? loadSlot(autoSlot);
        if (data) {
          apply(data);
          console.info('[save] loaded slot', data.timestamp);
        } else {
          console.warn('[save] no save found to load');
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [autoSlot, manSlot]);
}
