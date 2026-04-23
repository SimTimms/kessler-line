import { useState, useEffect } from 'react';

/** Total number of loading stages before the game is ready. */
export const TOTAL_STAGES = 4;

let _stage = 0;
const _listeners = new Set<() => void>();

/** Read the current load stage outside React (e.g. in useFrame). */
export function getLoadStage(): number {
  return _stage;
}

/** Advance to `toStage` (no-op if already at or past that stage). */
export function advanceLoadStage(toStage: number): void {
  if (toStage > _stage) {
    _stage = Math.min(toStage, TOTAL_STAGES);
    _listeners.forEach(fn => fn());
  }
}

/** React hook — subscribes to stage changes and triggers re-renders. */
export function useLoadStage(): number {
  const [stage, setStage] = useState(_stage);
  useEffect(() => {
    const update = () => setStage(_stage);
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);
  return stage;
}
