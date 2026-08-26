import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ThrustPanel from '../../App/ThrustPanel';
import './ShipControlsHUD.css';

interface ShipControlsHUDProps {
  thrustLevel?: number;
  setThrustLevel?: Dispatch<SetStateAction<number>>;
}

/** Vertical thrust slider — embedded in unified controls panel. */
const ShipControlsHUD = memo(function ShipControlsHUD({
  thrustLevel,
  setThrustLevel,
}: ShipControlsHUDProps) {
  return (
    <div className="mech-thrust" aria-label="Thrust">
      <ThrustPanel embedded thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
    </div>
  );
});

export default ShipControlsHUD;
