import { useEffect, useState } from 'react';
import { getAlerts, subscribeAlerts, type AlertMessage } from '../../../context/AlertsStore';
import './AlertsHUD.css';

function useAlerts(): readonly AlertMessage[] {
  const [items, setItems] = useState(() => getAlerts());
  useEffect(() => subscribeAlerts(() => setItems(getAlerts())), []);
  return items;
}

export default function AlertsHUD() {
  const items = useAlerts();
  const latest = items[0] ?? null;

  return (
    <div className="alerts-bar" aria-label="Alerts" aria-live="polite">
      {latest ? (
        <div
          key={latest.id}
          className={`alerts-bar-text alerts-bar-text--${latest.level} alerts-bar-text--flash`}
        >
          {latest.text}
        </div>
      ) : (
        <div className="alerts-bar-text alerts-bar-text--idle">STANDBY</div>
      )}
    </div>
  );
}
