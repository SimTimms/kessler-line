import { useState } from 'react';
import { getStationResidents, ROLE_LABELS } from '../../narrative/stationCharacters';
import StationDialogue from './StationDialogue';
import './StationCrewPanel.css';

interface StationCrewPanelProps {
  dockedStation: string | null;
}

/**
 * Roster of the people aboard the docked station. Shows a portrait + name +
 * role for each resident; selecting one opens the conversation. Rendered only
 * while docked at a station with residents (gated by the parent). The parent
 * keys this on `dockedStation`, so selection resets when the station changes.
 */
export default function StationCrewPanel({ dockedStation }: StationCrewPanelProps) {
  const residents = getStationResidents(dockedStation);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (residents.length === 0) return null;

  const active = residents.find((c) => c.id === activeId) ?? null;

  return (
    <>
      <div className="station-crew">
        <div className="station-crew-title">PEOPLE ABOARD</div>
        {residents.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`station-crew-row${active?.id === c.id ? ' is-active' : ''}`}
            onClick={() => setActiveId(c.id)}
          >
            <img className="station-crew-portrait" src={c.portrait} alt={c.name} />
            <span className="station-crew-id">
              <span className="station-crew-name">{c.name}</span>
              <span className="station-crew-role">{ROLE_LABELS[c.role]}</span>
            </span>
          </button>
        ))}
      </div>

      {active && <StationDialogue character={active} onClose={() => setActiveId(null)} />}
    </>
  );
}
