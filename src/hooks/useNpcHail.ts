import { useState, useEffect } from 'react';
import type { NPCHailDetail } from '../components/NPCContactDialog';

export function useNpcHail(docked: boolean) {
  const [npcHail, setNpcHail] = useState<NPCHailDetail | null>(null);

  useEffect(() => {
    const onNPCHail = (e: Event) => {
      const detail = (e as CustomEvent<NPCHailDetail>).detail;
      if (!docked) setNpcHail(detail);
    };
    window.addEventListener('NPCHail', onNPCHail);
    return () => window.removeEventListener('NPCHail', onNPCHail);
  }, [docked]);

  return { npcHail, setNpcHail };
}
