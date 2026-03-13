import { useState, useEffect, useRef } from 'react';
import './RadioChatterStream.css';

interface ChatterEntry {
  shipId: string;
  text: string;
}

const CHATTER: ChatterEntry[] = [
  { shipId: 'HEKTOR-7', text: 'Running isotopes to Depot-4. ETA six hours, nothing unusual.' },
  { shipId: 'MERIDIAN', text: 'Fuel cells at 40%. Pulling into the beacon lane to top off.' },
  { shipId: 'DUST-RUNNER', text: 'Anyone on this freq? Looking for a nav fix near the belt.' },
  { shipId: 'FREIGHTER-12', text: 'Cargo manifest confirmed. Departing the outer ring now.' },
  {
    shipId: 'CASSIAN',
    text: 'Watch the debris drift on approach vector 7. It has moved since last cycle.',
  },
  { shipId: 'IRON WAKE', text: 'Hauling silicates to the refinery. Two-day run, nothing fancy.' },
  {
    shipId: 'VESTA-3',
    text: 'Beacon is weak out here. Running on dead reckoning past the 40k mark.',
  },
  { shipId: 'COLDFORGE', text: 'What is the tariff situation at Neptune depot right now?' },
  {
    shipId: 'NEPTUNE TRAFFIC',
    text: 'All inbound: reduce speed on outer approach. Congestion at docking ring.',
  },
  {
    shipId: 'TERN',
    text: 'Lost a cargo pod between waypoints 12 and 14. If you retrieve it, hail me.',
  },
  { shipId: 'SOLACE', text: 'Water ice delivery for the station. Bay 3 is expecting us.' },
  {
    shipId: 'WAYPOINT-9',
    text: 'Refinery prices are down again. Margins are getting thin out here.',
  },
  { shipId: 'HEKTOR-7', text: 'Drive is running hot. Might need to lay over at the depot.' },
  {
    shipId: 'DUST-RUNNER',
    text: 'Got refined metals on offer. Interested parties hail channel 4.',
  },
  { shipId: 'KESSLER-9', text: 'Docking queue at Neptune is three deep. Expect a two-hour wait.' },
  {
    shipId: 'MERIDIAN',
    text: 'Anyone running the inner route? Heard there is debris scatter near the marker.',
  },
  { shipId: 'COLDFORGE', text: 'Picked up a salvage contract near the belt. Should keep us busy.' },
  { shipId: 'IRON WAKE', text: 'Engines just passed diagnostics. Good for another long run.' },
  { shipId: 'VESTA-3', text: 'Trade window at the depot closes in four hours. Cutting it close.' },
  {
    shipId: 'CASSIAN',
    text: 'That last haul paid well. Thinking of running the outer loop next cycle.',
  },
  { shipId: 'TERN', text: 'Anyone know the current fuel rate at the Neptune ring beacon?' },
  {
    shipId: 'SOLACE',
    text: 'Comms were down for six hours. Missed two hails. If you called, try again.',
  },
  {
    shipId: 'NEPTUNE TRAFFIC',
    text: 'Bay 7 is now clear. HEKTOR-7, you are cleared for final approach.',
  },
  { shipId: 'KESSLER-9', text: 'Selling surplus oxygen canisters. Priced to move. Hail direct.' },
  { shipId: 'FREIGHTER-12', text: 'Offloading finished. Back on course. Next stop: outer beacon.' },
  {
    shipId: 'WAYPOINT-9',
    text: 'Had a close pass with a chunk of loose rock. Nothing hit, but it was close.',
  },
  { shipId: 'MERIDIAN', text: 'Looking for a co-pilot on the next outer run. Legitimate work.' },
  { shipId: 'HEKTOR-7', text: 'Depot confirmed the refuel window. Docking in twenty.' },
  {
    shipId: 'DUST-RUNNER',
    text: 'If anyone is heading sunward, I have a small parcel. Off the books.',
  },
  {
    shipId: 'IRON WAKE',
    text: 'Ran the numbers. The Neptune route is profitable if you do not rush it.',
  },
  {
    shipId: 'COLDFORGE',
    text: 'Just heard the Sector 9 feeds cut out again. Third time this month.',
  },
  {
    shipId: 'CASSIAN',
    text: 'Navigation update received. Route looks clear past the marker buoy.',
  },
  { shipId: 'VESTA-3', text: 'Cargo hold is empty. Taking anything headed toward the depot zone.' },
  { shipId: 'TERN', text: 'Woke up to a pressure alarm. False reading, thank the hull sensors.' },
  {
    shipId: 'NEPTUNE TRAFFIC',
    text: 'Attention all vessels: magnetic anomaly logged at grid 14-C. Proceed with caution.',
  },
  { shipId: 'KESSLER-9', text: 'Running quiet today. Just me and the drive hum.' },
  { shipId: 'SOLACE', text: 'Station confirmed delivery. Credits cleared. Good run.' },
  {
    shipId: 'FREIGHTER-12',
    text: 'Anyone else hearing static on the upper band? Started about an hour ago.',
  },
  {
    shipId: 'WAYPOINT-9',
    text: 'Three weeks out. Starting to feel it. Looking forward to the depot layover.',
  },
  {
    shipId: 'HEKTOR-7',
    text: 'Trade price on water ice just dropped. Whoever dumped stock, thanks for nothing.',
  },
  {
    shipId: 'PRINCESS BLUE',
    text: 'Cargo secured. Heading back out on the long run. Do not wait up.',
  },
  {
    shipId: 'PRINCESS BLUE',
    text: 'Anyone near grid 22 with spare coolant cells? Willing to trade.',
  },
  {
    shipId: 'PRINCESS BLUE',
    text: 'Drive signature clean, hull integrity nominal. Good day to be out here.',
  },
  { shipId: 'ROCINANTE', text: 'Running dark on the outer edge. Hail if you need us.' },
  {
    shipId: 'ROCINANTE',
    text: 'Picked up something odd on passive sensors. Probably nothing. Logging it.',
  },
  { shipId: 'ROCINANTE', text: 'We are not hauling freight today. Just passing through.' },
];

interface ActiveLine {
  key: number;
  shipId: string;
  text: string;
}

const LINE_DURATION_MS = 8000;
const MIN_INTERVAL_MS = 7000;
const MAX_INTERVAL_MS = 20000;
const FIRST_LINE_DELAY_MS = 4000;
const MAX_VISIBLE = 4;

let _key = 0;

export default function RadioChatterStream() {
  const [lines, setLines] = useState<ActiveLine[]>([]);
  const usedRef = useRef<number[]>([]);

  const pickNext = (): ChatterEntry => {
    if (usedRef.current.length >= CHATTER.length) usedRef.current = [];
    let idx: number;
    do {
      idx = Math.floor(Math.random() * CHATTER.length);
    } while (usedRef.current.includes(idx));
    usedRef.current.push(idx);
    return CHATTER[idx];
  };

  const addLine = (entry: ChatterEntry) => {
    const key = _key++;
    setLines((prev) => {
      const next = [...prev, { key, ...entry }];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
    window.setTimeout(() => {
      setLines((prev) => prev.filter((l) => l.key !== key));
    }, LINE_DURATION_MS);
  };

  useEffect(() => {
    let timer: number;

    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        addLine(pickNext());
        schedule(MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
      }, delay);
    };

    schedule(FIRST_LINE_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (lines.length === 0) return null;

  return (
    <div className="rcs-container">
      {lines.map((line) => (
        <div key={line.key} className="rcs-line">
          <svg
            className="rcs-icon"
            viewBox="0 0 12 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M1 9 Q6 4 11 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M3 7 Q6 4.5 9 7"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="6" cy="6.2" r="0.9" fill="currentColor" />
          </svg>
          <span className="rcs-id">{line.shipId}</span>
          <span className="rcs-sep"> › </span>
          <span className="rcs-text">{line.text}</span>
        </div>
      ))}
    </div>
  );
}
