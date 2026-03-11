import { useEffect } from 'react';
import { playUiClick } from '../context/SoundManager';

export function useGlobalButtonSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('button')) playUiClick();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
