import { useEffect } from 'react';
import { setThrusterKeyState } from '../context/ThrusterRegistry';

let listenerCount = 0;

/** Global keyboard listener for thruster key bindings (KeyboardEvent.code). */
export function useThrusterKeyListeners(): void {
  useEffect(() => {
    listenerCount += 1;
    if (listenerCount > 1) {
      return () => {
        listenerCount -= 1;
      };
    }

    const onKeyDown = (event: KeyboardEvent) => {
      setThrusterKeyState(event.code, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      setThrusterKeyState(event.code, false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      listenerCount -= 1;
    };
  }, []);
}
