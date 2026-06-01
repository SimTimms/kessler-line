import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ThrustPanel from '../../App/ThrustPanel';
import './ShipControlsHUD.css';

interface ShipControlsHUDProps {
  thrustLevel?: number;
  setThrustLevel?: Dispatch<SetStateAction<number>>;
}

/** Vertical thrust slider beside the scanner deck. */
const ShipControlsHUD = memo(function ShipControlsHUD({
  thrustLevel,
  setThrustLevel,
}: ShipControlsHUDProps) {
  return (
    <div className="helmet-ship-controls" aria-label="Thrust">
      <div className="helmet-ship-controls-head">THRUST</div>
      <ThrustPanel embedded thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
    </div>
  );
});

export default ShipControlsHUD;
