import { useState, useEffect } from 'react';

export function useThrustLevel(initial: number = 1) {
  const [thrustLevel, setThrustLevel] = useState(initial);

  useEffect(() => {
    const onThrustChanged = (e: Event) => {
      const { value } = (e as CustomEvent<{ value: number }>).detail;
      setThrustLevel(value);
    };
    window.addEventListener('ThrustChanged', onThrustChanged);
    return () => window.removeEventListener('ThrustChanged', onThrustChanged);
  }, []);

  return { thrustLevel, setThrustLevel };
}
