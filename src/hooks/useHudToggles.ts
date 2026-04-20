import { useState, useEffect } from 'react';
import { KEY_TOGGLE_MINIMAP } from '../config/keybindings';

export function useHudToggles() {
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === KEY_TOGGLE_MINIMAP) setShowMinimap((v) => !v);
    };
    const onOpen = () => setShowMinimap(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-minimap', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-minimap', onOpen);
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
    showMinimap,
  };
}
