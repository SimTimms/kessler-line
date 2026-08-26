import { useState, useEffect } from 'react';
import { EVENT_SHIP_POWER_DEPLETED } from '../context/shipPowerSystems';

export function useHudToggles() {
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);

  useEffect(() => {
    const onPowerDepleted = () => {
      setSpotlightOn(false);
      setMagneticOn(false);
      setDriveSignatureOn(false);
      setProximity(false);
      setRadioOn(false);
    };
    window.addEventListener(EVENT_SHIP_POWER_DEPLETED, onPowerDepleted);
    return () => {
      window.removeEventListener(EVENT_SHIP_POWER_DEPLETED, onPowerDepleted);
    };
  }, []);

  return {
    spotlightOn,
    setSpotlightOn,
    magneticOn,
    setMagneticOn,
    driveSignatureOn,
    setDriveSignatureOn,
    proximity,
    setProximity,
    radioOn,
    setRadioOn,
  };
}
