import { createContext, useContext, useRef, useState } from 'react';
import { useFrameUpdate } from '../hooks/useFrameUpdate';

interface TimeContextValue {
  time: number; // 0 → 24 (hours)
  t: number; // 0 → 1 normalized cycle
  speed: number; // seconds per full cycle
}

const TimeContext = createContext<TimeContextValue | null>(null);

export function useGameTime() {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error('useGameTime must be inside <TimeProvider>');
  return ctx;
}

export function TimeProvider({
  children,
  cycleDuration = 10, // seconds for a full 24h cycle
}: {
  children: React.ReactNode;
  cycleDuration?: number;
}) {
  const [time, setTime] = useState(6); // start at 6 AM

  // Seeded on the first tick rather than during render, which must stay pure.
  const startRef = useRef(0);

  useFrameUpdate(() => {
    if (startRef.current === 0) startRef.current = performance.now();
    const elapsed = (performance.now() - startRef.current) / 1000;
    const t = (elapsed % cycleDuration) / cycleDuration; // 0 → 1
    setTime(t * 24); // convert to 24h clock
  });

  const t = time / 24;

  return (
    <TimeContext.Provider value={{ time, t, speed: cycleDuration }}>
      {children}
    </TimeContext.Provider>
  );
}
