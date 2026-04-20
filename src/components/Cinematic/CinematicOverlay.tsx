import { useEffect, useState } from 'react';
import { shipInstructionMessage } from '../../context/CinematicState';

export default function CinematicOverlay() {
  const [instructionLine, setInstructionLine] = useState('');

  useEffect(() => {
    const poll = window.setInterval(() => {
      setInstructionLine(shipInstructionMessage.current);
    }, 300);

    return () => window.clearInterval(poll);
  }, []);

  const displayLine = instructionLine;
  const displayClass = instructionLine ? 'cinematic-instruction' : 'cinematic-alert';

  return (
    <div className="cinematic-overlay">
      <div className={displayClass}>{displayLine}</div>
    </div>
  );
}
