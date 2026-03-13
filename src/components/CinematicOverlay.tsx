import { useEffect, useState } from 'react';
import {
  neptuneNoFlyZoneMessage,
  shipInstructionMessage,
  radioChatterMessage,
} from '../context/CinematicState';

export default function CinematicOverlay() {
  const [radioLine, setRadioLine] = useState('');
  const [noFlyLine, setNoFlyLine] = useState('');
  const [instructionLine, setInstructionLine] = useState('');

  useEffect(() => {
    const poll = window.setInterval(() => {
      setRadioLine(radioChatterMessage.current);
      setNoFlyLine(neptuneNoFlyZoneMessage.current);
      setInstructionLine(shipInstructionMessage.current);
    }, 300);

    return () => window.clearInterval(poll);
  }, []);

  if (!radioLine && !noFlyLine && !instructionLine) return null;

  let displayLine = '';
  let displayClass = 'cinematic-chatter';
  if (instructionLine) {
    displayLine = instructionLine;
    displayClass = 'cinematic-instruction';
  } else if (noFlyLine) {
    displayLine = noFlyLine;
    displayClass = 'cinematic-alert';
  } else {
    displayLine = radioLine;
    displayClass = 'cinematic-chatter';
  }

  return (
    <div className="cinematic-overlay">
      <div className={displayClass}>{displayLine}</div>
    </div>
  );
}
