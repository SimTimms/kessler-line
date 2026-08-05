import { useEffect, useState } from 'react';

const VISIBLE_MS = 1800;

export default function AutosaveIndicator() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onSave = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };
    window.addEventListener('autosave', onSave);
    return () => {
      window.removeEventListener('autosave', onSave);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className={`autosave-indicator${visible ? ' autosave-indicator--visible' : ''}`}
      aria-hidden="true"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 1h9l3 3v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <rect x="4" y="1" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
        <rect x="3" y="9" width="8" height="5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
      </svg>
      <span className="autosave-indicator-label">Saving</span>
    </div>
  );
}
