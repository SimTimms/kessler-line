import { useEffect, useState } from 'react';
import { getAlerts, subscribeAlerts, type AlertMessage } from '../../../context/AlertsStore';
import '../HUD/ScannerHUD.css';
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
    <div className="mech-alerts mech-scanner" aria-label="Alerts" aria-live="polite">
      <div className="mech-alerts-bezel">
        <div className="mech-alerts-head">
          <span className="mech-alerts-lamp" aria-hidden />
          <span className="mech-alerts-title">ALERTS</span>
          <span className="mech-alerts-sub">SYS</span>
        </div>

        <div className="mech-alerts-body">
          <div className="helmet-scanner-section-crt mech-alerts-screen">
            {latest ? (
              <div
                key={latest.id}
                className={`mech-alerts-line mech-alerts-line--${latest.level} mech-alerts-line--flash`}
              >
                {latest.text}
              </div>
            ) : (
              <div className="mech-alerts-line mech-alerts-line--idle">STANDBY</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
