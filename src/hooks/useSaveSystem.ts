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

const AUTOSAVE_INTERVAL_S = 60;
const MANUAL_SLOT = 'manual';

export function useSaveSystem() {
  const timeSinceLastSave = useRef(0);

  // Auto-save on interval
  useFrame((_state, delta) => {
    timeSinceLastSave.current += delta;
    if (timeSinceLastSave.current >= AUTOSAVE_INTERVAL_S) {
      timeSinceLastSave.current = 0;
      saveSlot(AUTOSAVE_SLOT, 'Autosave', capture());
      console.debug('[save] autosaved');
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5') {
        e.preventDefault();
        saveSlot(MANUAL_SLOT, 'Manual Save', capture());
        console.info('[save] manual save written');
      }
      if (e.key === 'F9') {
        e.preventDefault();
        const data = loadSlot(MANUAL_SLOT) ?? loadSlot(AUTOSAVE_SLOT);
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
  }, []);
}
