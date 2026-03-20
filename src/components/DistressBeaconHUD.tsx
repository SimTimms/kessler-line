import { useEffect, useRef, useState } from 'react';
import { cascadePhase } from '../context/CinematicState';

const MAX_BEACONS = 50;

// Ship names drawn from the game universe and invented vessels
const SHIP_NAMES = [
  'ACHERON-2',
  'SABLE-WING',
  'STELLAROSA',
  'IKORA',
  'CETUS-3',
  'VESSEL YANTARA',
  'BRASK-ACTUAL',
  'STATION MINERVA',
  'OUTRIDER-7',
  'TRANSPORT-09',
  'MV HELION',
  'MV PALLOR',
  'DRIFT-3',
  'RELAY THETA',
  'SUPPLY-22',
  'TANKER-BRAVO',
  'THE LONG HAUL',
  'FERRY-14',
  'KASTOR',
  'MERIDIAN',
  'COLDFIRE',
  'VAGRANT III',
  'MV BELKA',
  'MV EREBUS',
  'TRANSIT-06',
  'HERALD-3',
  'MV JUNO',
  'ORION-7',
  'SHUTTLE-4',
  'CERULEAN',
  'MV SOLVANG',
  'TC NESTOR',
  'TC CYGNUS-4',
  'PL IRONSIDE',
  'WAYPOINT-9',
  'DEPOT-KAPPA',
  'MV LUCENT',
  'RELAY-11',
  'SIRIX STATION',
  'FREIGHTER-09',
];

type Beacon = {
  id: number;
  name: string;
  x: number;
  y: number;
};

export default function DistressBeaconHUD() {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const activeRef = useRef(false);
  const countRef = useRef(0);
  const nextIdRef = useRef(0);
  const timeoutRef = useRef(0);

  useEffect(() => {
    const spawnOne = () => {
      if (!activeRef.current || cascadePhase.current !== 'during' || countRef.current >= MAX_BEACONS)
        return;

      const name = SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)];
      setBeacons((prev) => [
        ...prev,
        {
          id: nextIdRef.current++,
          name,
          x: 3 + Math.random() * 89,
          y: 3 + Math.random() * 84,
        },
      ]);
      countRef.current++;

      // Interval accelerates as more beacons appear (2.5s → 0.4s)
      const progress = countRef.current / MAX_BEACONS;
      const delay = Math.max(350, 2500 - progress * 2100 + (Math.random() - 0.5) * 500);
      timeoutRef.current = window.setTimeout(spawnOne, delay);
    };

    const poll = window.setInterval(() => {
      const phase = cascadePhase.current;
      if (phase === 'during' && !activeRef.current) {
        activeRef.current = true;
        spawnOne();
      } else if (phase === 'pre' && activeRef.current) {
        // Debug panel reset — clear beacons
        activeRef.current = false;
        window.clearTimeout(timeoutRef.current);
        countRef.current = 0;
        setBeacons([]);
      }
    }, 250);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!beacons.length) return null;

  return (
    <div className="db-hud">
      {beacons.map((b) => (
        <div
          key={b.id}
          className="db-beacon"
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
        >
          <div className="db-sphere-wrap">
            <div className="db-ring" />
            <div className="db-ring db-ring--2" />
            <div className="db-dot" />
          </div>
          <div className="db-labels">
            <span className="db-word">DISTRESS</span>
            <span className="db-name">{b.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
