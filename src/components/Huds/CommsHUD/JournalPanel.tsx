import * as THREE from 'three';
import { MapPin } from 'lucide-react';
import { useMissionJournal } from '../../../hooks/useMissionJournal';
import { getMissionDef, MISSION_DEFS } from '../../../config/missionConfig';
import { setNavTarget } from '../../../context/NavTarget';

function handleSetNav(missionId: string) {
  const def = getMissionDef(missionId);
  if (!def?.waypoint) return;
  const pos = new THREE.Vector3(def.waypoint[0], def.waypoint[1], def.waypoint[2]);
  setNavTarget(def.waypointCollidableId ?? def.waypointLabel ?? def.id, pos);
}

export default function JournalPanel() {
  const { activeMissions, completedMissions } = useMissionJournal();
  const activeDefs = activeMissions.map((id) => getMissionDef(id)).filter(Boolean);

  const completedDefs = completedMissions.map((id) => MISSION_DEFS[id]).filter(Boolean);

  return (
    <div className="comms-journal">
      <div className="comms-journal-scroll">
        {activeDefs.length > 0 ? (
          activeDefs.map((def) => {
            if (!def) return null;
            return (
              <div key={def.id} className="comms-journal-entry">
                <div className="hud-chat-standard">{def.title}</div>
                <div className="hud-chat-standard-grey">{def.description}</div>
                {def.waypoint && (
                  <button
                    type="button"
                    className="event-log-tab"
                    onClick={() => handleSetNav(def.id)}
                    title={`Set nav to ${def.waypointLabel ?? def.title}`}
                  >
                    <MapPin size={10} strokeWidth={2} />
                    <span>SET NAV TARGET</span>
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="event-log-empty">No active mission</div>
        )}
        {completedDefs.map((def) => (
          <div key={def.id} className="comms-journal-entry comms-journal-entry--completed">
            <div className="comms-journal-entry-desc">
              <span>{def.title} - COMPLETE</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
