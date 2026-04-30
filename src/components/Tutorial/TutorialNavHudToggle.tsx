import { useEffect, useState } from 'react';
import { KEY_TOGGLE_NAV_HUD, displayLabelForKeyCode } from '../../config/keybindings';
import { navHudEnabledRef, setNavHudEnabled } from '../../context/NavHud';

interface Props {
  flashing: boolean;
}

export default function TutorialNavHudToggle({ flashing }: Props) {
  const [enabled, setEnabled] = useState(navHudEnabledRef.current);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== KEY_TOGGLE_NAV_HUD) return;
      const next = !navHudEnabledRef.current;
      setNavHudEnabled(next);
      setEnabled(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onClick = () => {
    const next = !navHudEnabledRef.current;
    setNavHudEnabled(next);
    setEnabled(next);
  };

  return (
    <button
      type="button"
      className={`tutorial-navhud-toggle${enabled ? ' tutorial-navhud-toggle--on' : ''}${flashing ? ' tutorial-navhud-toggle--flash' : ''}`}
      onClick={onClick}
    >
      <span className="tutorial-navhud-toggle__dot" aria-hidden />
      <span className="tutorial-navhud-toggle__label">NAV HUD</span>
      <span className="tutorial-navhud-toggle__state">[{enabled ? 'ON' : 'OFF'}]</span>
      <span className="tutorial-navhud-toggle__hint">{displayLabelForKeyCode(KEY_TOGGLE_NAV_HUD)}</span>
    </button>
  );
}
