import { useEffect, useState } from 'react';
import { neptuneNoFlyZoneMessage, shipInstructionMessage } from '../../context/CinematicState';

export default function CinematicOverlay() {
  const [noFlyLine, setNoFlyLine] = useState('');
  const [instructionLine, setInstructionLine] = useState('');

  useEffect(() => {
    const poll = window.setInterval(() => {
      setNoFlyLine(neptuneNoFlyZoneMessage.current);
      setInstructionLine(shipInstructionMessage.current);
    }, 300);

    return () => window.clearInterval(poll);
  }, []);

  if (!noFlyLine && !instructionLine) return null;

  const displayLine = instructionLine || noFlyLine;
  const displayClass = instructionLine ? 'cinematic-instruction' : 'cinematic-alert';

  return (
    <div className="cinematic-overlay">
      <div className={displayClass}>{displayLine}</div>
    </div>
  );
}
