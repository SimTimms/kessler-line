import { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    const start = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const t = (elapsed % cycleDuration) / cycleDuration; // 0 → 1
      const hours = t * 24; // convert to 24h clock
      setTime(hours);
      requestAnimationFrame(tick);
    };

    tick();
  }, [cycleDuration]);

  const t = time / 24;

  return (
    <TimeContext.Provider value={{ time, t, speed: cycleDuration }}>
      {children}
    </TimeContext.Provider>
  );
}
