import { memo, useEffect } from 'react';
import { CURRENT_SHIP } from '../../config/shipConfig';

/** Total display duration in ms: fade-in + hold + fade-out. */
const DISPLAY_DURATION_MS = 5200;

interface ShipTitleCardProps {
  onDone: () => void;
}

const ShipTitleCard = memo(function ShipTitleCard({ onDone }: ShipTitleCardProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, DISPLAY_DURATION_MS + 100);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="ship-title-card">
      <div className="ship-title-name">{CURRENT_SHIP.name}</div>
      <div className="ship-title-mission">{CURRENT_SHIP.mission}</div>
    </div>
  );
});

export default ShipTitleCard;
