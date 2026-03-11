import { useState } from 'react';

export function useThrustLevel(initial: number = 1) {
  const [thrustLevel, setThrustLevel] = useState(initial);
  return { thrustLevel, setThrustLevel };
}
