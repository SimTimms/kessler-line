import { useEffect } from 'react';
import { playUiClick, resumeAudioContext } from '../sound/SoundManager';

export function useGlobalButtonSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      resumeAudioContext();
      if ((e.target as Element).closest('button')) playUiClick();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
