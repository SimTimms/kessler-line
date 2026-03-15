import { useState, useEffect, useRef } from 'react';
import { chatterState } from '../context/CinematicState';
import { RADIO_CHATTER_LINES } from '../narrative';
import { playRadioChatterClip } from '../sound/SoundManager';
import './RadioChatterStream.css';

interface ChatterEntry {
  shipId: string;
  text: string;
}

function parseLine(raw: string): ChatterEntry {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { shipId: 'UNKNOWN', text: raw };
  return { shipId: raw.slice(0, colonIdx).trim(), text: raw.slice(colonIdx + 1).trim() };
}

// Seed chatterState with pre-cascade lines if not already set
if (chatterState.lines.length === 0) {
  chatterState.lines = RADIO_CHATTER_LINES;
}

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

  const currentLinesRef = useRef<string[]>(chatterState.lines);

  const pickNext = (): ChatterEntry => {
    const pool = chatterState.lines;
    // Reset used tracker if the pool changed (phase switch) or exhausted
    if (pool !== currentLinesRef.current) {
      currentLinesRef.current = pool;
      usedRef.current = [];
    }
    if (usedRef.current.length >= pool.length) usedRef.current = [];
    let idx: number;
    do {
      idx = Math.floor(Math.random() * pool.length);
    } while (usedRef.current.includes(idx));
    usedRef.current.push(idx);
    return parseLine(pool[idx]);
  };

  const addLine = (entry: ChatterEntry) => {
    playRadioChatterClip();
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
