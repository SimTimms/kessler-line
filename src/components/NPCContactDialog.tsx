import type React from 'react';

export interface NPCHailDetail {
  shipId: string;
  type: 'trade' | 'mission';
}

interface NPCContactDialogProps {
  detail: NPCHailDetail;
  onDismiss: () => void;
}

// Ship designations and their contact messages
const SHIP_DESIGNATIONS: Record<string, string> = {
  '0': 'HEKTOR-7',
};

const TRADE_CONTENT: Record<string, { header: string; body: string }> = {
  '0': {
    header: 'SURPLUS CARGO — FUEL CELLS',
    body: "We're carrying more fuel cells than we need and they're eating into our margins. Half price if you take them now. We don't need the credits as much as we need the cargo space.",
  },
};

const MISSION_CONTENT: Record<string, { header: string; body: string }> = {
  '0': {
    header: 'ESCORT CONTRACT',
    body: "Our drive is cycling wrong — diagnostics point to a thermal regulator but we can't fix it out here. Three days to the station at reduced thrust. We just need another ship in proximity while we limp in. Standard rate on arrival.",
  },
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0, 8, 18, 0.95)',
  border: '1px solid rgba(0, 200, 255, 0.4)',
  borderRadius: 6,
  padding: '28px 36px',
  fontFamily: 'monospace',
  color: '#00cfff',
  minWidth: 360,
  maxWidth: 480,
  textAlign: 'center',
  boxShadow: '0 0 32px rgba(0, 200, 255, 0.15)',
  pointerEvents: 'auto',
};

function actionBtn(accent: string): React.CSSProperties {
  return {
    padding: '10px 28px',
    fontFamily: 'monospace',
    fontSize: 13,
    letterSpacing: '0.08em',
    background: `rgba(${accent}, 0.12)`,
    color: `rgb(${accent})`,
    border: `1px solid rgba(${accent}, 0.6)`,
    borderRadius: 4,
    cursor: 'pointer',
    userSelect: 'none',
    boxShadow: `0 0 10px rgba(${accent}, 0.2)`,
  };
}

const dismissBtnStyle: React.CSSProperties = {
  padding: '10px 28px',
  fontFamily: 'monospace',
  fontSize: 13,
  letterSpacing: '0.08em',
  background: 'transparent',
  color: 'rgba(0, 200, 255, 0.45)',
  border: '1px solid rgba(0, 200, 255, 0.2)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
};

export default function NPCContactDialog({ detail, onDismiss }: NPCContactDialogProps) {
  const { shipId, type } = detail;
  const designation = SHIP_DESIGNATIONS[shipId] ?? `VESSEL-${shipId.toUpperCase()}`;
  const content =
    type === 'trade'
      ? (TRADE_CONTENT[shipId] ?? TRADE_CONTENT['0'])
      : (MISSION_CONTENT[shipId] ?? MISSION_CONTENT['0']);

  return (
    <div style={panelStyle}>
      {/* Header */}
      <p
        style={{
          margin: '0 0 4px',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'rgba(0, 200, 255, 0.5)',
        }}
      >
        INCOMING HAIL — {designation}
      </p>
      <p
        style={{
          margin: '0 0 20px',
          fontSize: 13,
          letterSpacing: '0.1em',
          color: type === 'trade' ? '#00ff88' : '#ffcc00',
        }}
      >
        {type === 'trade' ? 'TRADE OFFER' : 'MISSION OFFER'}
      </p>

      {/* Content block */}
      <div
        style={{
          background: 'rgba(0, 200, 255, 0.04)',
          border: '1px solid rgba(0, 200, 255, 0.15)',
          borderRadius: 4,
          padding: '14px 18px',
          marginBottom: 20,
          textAlign: 'left',
        }}
      >
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'rgba(0, 200, 255, 0.45)',
          }}
        >
          {content.header}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.75,
            color: '#a0e8ff',
          }}
        >
          {content.body}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          style={actionBtn(type === 'trade' ? '0, 255, 136' : '255, 200, 0')}
          onClick={onDismiss}
        >
          {type === 'trade' ? 'ACCEPT TRADE' : 'ACCEPT CONTRACT'}
        </button>
        <button style={dismissBtnStyle} onClick={onDismiss}>
          DECLINE
        </button>
      </div>

      <p
        style={{
          margin: '18px 0 0',
          fontSize: 11,
          color: 'rgba(0, 200, 255, 0.3)',
          letterSpacing: '0.05em',
        }}
      >
        TRANSMISSION ORIGIN: {designation} — PROXIMITY {'>'}RANGE
      </p>
    </div>
  );
}
