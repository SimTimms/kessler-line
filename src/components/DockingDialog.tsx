import type React from 'react';
import { useState } from 'react';

interface DockingDialogProps {
  stationId: string | null;
  activeMission?: 'kronos4' | 'mars' | 'neptune' | null;
  completedMissions?: string[];
  refueling?: boolean;
  transferringO2?: boolean;
  onRefuel?: () => void;
  onTransferO2?: () => void;
  onMissionSelect?: (mission: 'mars' | 'neptune' | 'kronos4') => void;
  onMissionComplete?: () => void;
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 20px',
    fontFamily: 'monospace',
    fontSize: 13,
    letterSpacing: '0.05em',
    background: active ? 'rgba(0, 200, 255, 0.25)' : 'rgba(0, 200, 255, 0.08)',
    color: '#00cfff',
    border: `1px solid ${active ? 'rgba(0, 200, 255, 0.9)' : 'rgba(0, 200, 255, 0.5)'}`,
    borderRadius: 4,
    cursor: 'pointer',
    userSelect: 'none',
    boxShadow: active ? '0 0 10px rgba(0, 200, 255, 0.4)' : 'none',
  };
}

const missionBtn: React.CSSProperties = {
  padding: '12px 24px',
  fontFamily: 'monospace',
  fontSize: 13,
  letterSpacing: '0.05em',
  background: 'rgba(0, 200, 255, 0.08)',
  color: '#00cfff',
  border: '1px solid rgba(0, 200, 255, 0.5)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
  width: '100%',
  textAlign: 'left',
};

const backBtn: React.CSSProperties = {
  padding: '6px 14px',
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: '0.05em',
  background: 'transparent',
  color: 'rgba(0, 200, 255, 0.5)',
  border: '1px solid rgba(0, 200, 255, 0.25)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
};

const acceptBtn: React.CSSProperties = {
  padding: '10px 32px',
  fontFamily: 'monospace',
  fontSize: 13,
  letterSpacing: '0.08em',
  background: 'rgba(0, 255, 136, 0.12)',
  color: '#00ff88',
  border: '1px solid rgba(0, 255, 136, 0.6)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
  boxShadow: '0 0 10px rgba(0, 255, 136, 0.2)',
};

const acknowledgeBtn: React.CSSProperties = {
  padding: '10px 32px',
  fontFamily: 'monospace',
  fontSize: 13,
  letterSpacing: '0.08em',
  background: 'rgba(255, 200, 0, 0.12)',
  color: '#ffcc00',
  border: '1px solid rgba(255, 200, 0, 0.5)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
};

const MISSIONS = {
  kronos4: {
    label: 'Retrieve Emergency Log — Kronos-4',
    destination: 'SPACE STATION',
    cargoLabel: '1× Emergency Data Recorder',
    availableAt: 'fuel-station',
    description:
      'Kronos-4 went dark 48 hours ago. Docking here, you find the crew gone — a CO2 recycler failure. No distress signal was ever broadcast. No one was coming.\n\nThe station\'s emergency recorder is still active in the cargo bay. Its data is intact: the full timeline, the system alerts, who tried to fix it and when they stopped trying.\n\nGet it to the Space Station. Someone has to know what happened out here.',
  },
  mars: {
    label: 'Deliver Food to Mars',
    destination: 'MARS',
    cargoLabel: '20 units of Food',
    availableAt: 'space-station',
    description:
      'Transport food supplies to the Mars colony. Your cargo hold will be loaded before departure.',
  },
  neptune: {
    label: 'Transfer Information to Neptune',
    destination: 'NEPTUNE',
    cargoLabel: '15 Data Cores',
    availableAt: 'space-station',
    description: 'Deliver classified data cores to the Neptune outpost. Handle with care.',
  },
} as const;

type MissionKey = keyof typeof MISSIONS;
type View = 'main' | 'missions' | 'brief' | 'complete';

export default function DockingDialog({
  stationId,
  activeMission,
  completedMissions = [],
  refueling = false,
  transferringO2 = false,
  onRefuel,
  onTransferO2,
  onMissionSelect,
  onMissionComplete,
}: DockingDialogProps) {
  const isDelivery = stationId === 'space-station' && activeMission === 'kronos4';

  const [view, setView] = useState<View>(() => (isDelivery ? 'complete' : 'main'));
  const [briefMission, setBriefMission] = useState<MissionKey | null>(null);

  const openBrief = (mission: MissionKey) => {
    setBriefMission(mission);
    setView('brief');
  };

  const acceptMission = () => {
    if (briefMission) {
      onMissionSelect?.(briefMission);
      setView('main');
      setBriefMission(null);
    }
  };

  const availableMissions = (Object.keys(MISSIONS) as MissionKey[]).filter(
    (key) => MISSIONS[key].availableAt === stationId && !completedMissions.includes(key)
  );

  const isFuelStation = stationId === 'fuel-station';
  const isSpaceStation = stationId === 'space-station';

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 8, 18, 0.95)',
        border: `1px solid ${isFuelStation && view === 'main' ? 'rgba(255, 80, 80, 0.4)' : 'rgba(0, 200, 255, 0.4)'}`,
        borderRadius: 6,
        padding: '28px 36px',
        fontFamily: 'monospace',
        color: '#00cfff',
        minWidth: 360,
        maxWidth: 480,
        textAlign: 'center',
        boxShadow:
          isFuelStation && view === 'main'
            ? '0 0 32px rgba(255, 80, 80, 0.12)'
            : '0 0 32px rgba(0, 200, 255, 0.15)',
        pointerEvents: 'auto',
      }}
    >
      {/* ── MAIN VIEW ─────────────────────────────────────────────── */}
      {view === 'main' && (
        <>
          {isFuelStation ? (
            /* Fuel station: distress log narrative */
            <>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'rgba(255, 80, 80, 0.7)',
                }}
              >
                INCOMING TRANSMISSION — KRONOS-4
              </p>
              <p
                style={{
                  margin: '0 0 18px',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'rgba(255, 80, 80, 0.45)',
                }}
              >
                AUTO-LOG ENTRY 048 &nbsp;|&nbsp; DAY 3 &nbsp;|&nbsp; 02:14:33
              </p>
              <div
                style={{
                  background: 'rgba(255, 40, 40, 0.05)',
                  border: '1px solid rgba(255, 80, 80, 0.2)',
                  borderRadius: 4,
                  padding: '14px 18px',
                  marginBottom: 20,
                  textAlign: 'left',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: '#ffaaaa',
                    fontStyle: 'italic',
                  }}
                >
                  "CO2 recycler unit B offline. Emergency reserves failing.
                  <br />
                  <br />
                  Petrov and Rao aren't responding. I can hear Mele in the cargo module but the
                  hatch is sealed and comms are down.
                  <br />
                  <br />
                  If you're reading this — the emergency recorder is in cargo bay 3. Get it out.
                  Someone needs to know what happened here.
                  <br />
                  <br />
                  It wasn't an accident."
                </p>
                <p
                  style={{
                    margin: '12px 0 0',
                    fontSize: 11,
                    color: 'rgba(255, 150, 150, 0.6)',
                    textAlign: 'right',
                  }}
                >
                  — T. Vasquez, Systems Engineer, Kronos-4
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button style={btn(refueling)} onClick={onRefuel}>
                  {refueling ? 'REFUELING...' : 'REFUEL'}
                </button>
                <button style={btn(transferringO2)} onClick={onTransferO2}>
                  {transferringO2 ? 'TRANSFERRING...' : 'TRANSFER O2'}
                </button>
                <button style={btn(false)} onClick={() => setView('missions')}>
                  MISSIONS
                </button>
              </div>
            </>
          ) : (
            /* All other stations: standard docking dialog */
            <>
              <p
                style={{ margin: '0 0 6px', fontSize: 11, letterSpacing: '0.12em', color: 'rgba(0, 200, 255, 0.5)' }}
              >
                {isSpaceStation ? 'STATION ALPHA — DOCKED' : 'DOCKING SEQUENCE COMPLETE'}
              </p>
              <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: '#a0e8ff' }}>
                {isSpaceStation
                  ? 'Station services available. Select an option below.'
                  : 'Select a station service:'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button style={btn(refueling)} onClick={onRefuel}>
                  {refueling ? 'REFUELING...' : 'REFUEL'}
                </button>
                <button style={btn(transferringO2)} onClick={onTransferO2}>
                  {transferringO2 ? 'TRANSFERRING...' : 'TRANSFER O2'}
                </button>
                <button style={btn(false)} onClick={() => setView('missions')}>
                  MISSIONS
                </button>
              </div>
            </>
          )}
          <p
            style={{
              margin: '20px 0 0',
              fontSize: 12,
              color: 'rgba(0, 200, 255, 0.45)',
              letterSpacing: '0.05em',
            }}
          >
            Press Spacebar to undock
          </p>
        </>
      )}

      {/* ── MISSIONS VIEW ─────────────────────────────────────────── */}
      {view === 'missions' && (
        <>
          <p
            style={{ margin: '0 0 20px', fontSize: 14, letterSpacing: '0.08em', color: '#a0e8ff' }}
          >
            SELECT MISSION
          </p>
          {availableMissions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(0, 200, 255, 0.4)', margin: '0 0 20px' }}>
              No missions available.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {availableMissions.map((key) => (
                <button key={key} style={missionBtn} onClick={() => openBrief(key)}>
                  {MISSIONS[key].label}
                </button>
              ))}
            </div>
          )}
          <button style={backBtn} onClick={() => setView('main')}>
            ← BACK
          </button>
        </>
      )}

      {/* ── MISSION BRIEF VIEW ────────────────────────────────────── */}
      {view === 'brief' && briefMission && (
        <>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'rgba(0, 200, 255, 0.5)',
            }}
          >
            MISSION BRIEF
          </p>
          <p
            style={{ margin: '0 0 18px', fontSize: 15, letterSpacing: '0.06em', color: '#00cfff' }}
          >
            {MISSIONS[briefMission].label.toUpperCase()}
          </p>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              lineHeight: 1.75,
              color: '#a0e8ff',
              textAlign: 'left',
              whiteSpace: 'pre-line',
            }}
          >
            {MISSIONS[briefMission].description}
          </p>
          <div
            style={{
              background: 'rgba(0, 200, 255, 0.06)',
              border: '1px solid rgba(0, 200, 255, 0.2)',
              borderRadius: 4,
              padding: '10px 16px',
              marginBottom: 20,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                color: 'rgba(0, 200, 255, 0.5)',
                marginBottom: 4,
              }}
            >
              CARGO MANIFEST
            </div>
            <div style={{ fontSize: 14, color: '#00ff88' }}>{MISSIONS[briefMission].cargoLabel}</div>
            <div style={{ fontSize: 11, color: 'rgba(0, 200, 255, 0.5)', marginTop: 2 }}>
              DESTINATION: {MISSIONS[briefMission].destination}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button style={backBtn} onClick={() => setView('missions')}>
              ← BACK
            </button>
            <button style={acceptBtn} onClick={acceptMission}>
              ACCEPT MISSION
            </button>
          </div>
        </>
      )}

      {/* ── MISSION COMPLETE VIEW ─────────────────────────────────── */}
      {view === 'complete' && (
        <>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'rgba(255, 200, 0, 0.6)',
            }}
          >
            INCIDENT REPORT FILED
          </p>
          <p
            style={{
              margin: '0 0 20px',
              fontSize: 15,
              letterSpacing: '0.08em',
              color: '#ffcc00',
            }}
          >
            MISSION: KRONOS-4 EMERGENCY LOG
          </p>
          <div
            style={{
              background: 'rgba(255, 200, 0, 0.05)',
              border: '1px solid rgba(255, 200, 0, 0.2)',
              borderRadius: 4,
              padding: '14px 18px',
              marginBottom: 20,
              textAlign: 'left',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: '#ffe080' }}>
              Data recorder uploaded. Incident logged as:{' '}
              <em>Equipment Failure, Non-Criminal.</em>
            </p>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13,
                lineHeight: 1.75,
                color: 'rgba(255, 220, 120, 0.75)',
              }}
            >
              Four crew. Three fatalities. One survivor — Vasquez — evacuated by automated pod.
              Current status: unknown.
            </p>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13,
                lineHeight: 1.75,
                color: 'rgba(255, 220, 120, 0.75)',
              }}
            >
              The recycler that failed was flagged for replacement eight months ago. The requisition
              was denied twice — supply shortages. They knew.
            </p>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 12,
                color: 'rgba(255, 200, 0, 0.5)',
                borderTop: '1px solid rgba(255, 200, 0, 0.15)',
                paddingTop: 10,
              }}
            >
              Your account has been credited: <span style={{ color: '#ffcc00' }}>45 fuel units</span>. That's how it works out here.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              style={acknowledgeBtn}
              onClick={() => {
                onMissionComplete?.();
                setView('main');
              }}
            >
              ACKNOWLEDGE
            </button>
          </div>
        </>
      )}
    </div>
  );
}
