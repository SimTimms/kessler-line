import { memo, useEffect } from 'react';
import { KEY_TOGGLE_NAV_HUD } from '../../config/keybindings';
import { navHudEnabledRef, setNavHudEnabled } from '../../context/NavHud';

/** Global KeyN toggles Nav HUD (target line, orbit arcs, etc.) — same in game and tutorials. */
const NavHudKeyBinding = memo(function NavHudKeyBinding() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== KEY_TOGGLE_NAV_HUD) return;
      if (e.repeat) return;
      setNavHudEnabled(!navHudEnabledRef.current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return null;
});

export default NavHudKeyBinding;
