import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { tutorialThrustersHighlightedRef } from '../context/TutorialState';

/**
 * R3F hook — must be called inside a <Canvas>. Reads tutorialThrustersHighlightedRef
 * each frame and returns it as React state, triggering re-renders only when the
 * value actually changes (i.e. at most once per tutorial step advance).
 */
export function useTutorialThrustersHighlighted(): string[] {
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const prevRef = useRef<string[]>([]);

  useFrame(() => {
    const next = tutorialThrustersHighlightedRef.current;
    const prev = prevRef.current;
    if (next.length !== prev.length || next.some((v, i) => v !== prev[i])) {
      prevRef.current = next;
      setHighlighted(next);
    }
  });

  return highlighted;
}
