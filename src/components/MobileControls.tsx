import {
  mobileThrustForward,
  mobileThrustReverse,
  mobileThrustLeft,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
} from '../context/ShipState';

const BTN: React.CSSProperties = {
  width: 44,
  height: 44,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,200,255,0.1)',
  border: '1px solid rgba(0,200,255,0.35)',
  borderRadius: 0,
  color: '#00cfff',
  fontFamily: 'monospace',
  fontSize: 16,
  fontWeight: 'bold',
  userSelect: 'none',
  touchAction: 'none',
  pointerEvents: 'auto',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

const LABEL: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1,
  marginTop: 2,
  opacity: 0.7,
};

function ThrustBtn({
  icon,
  label,
  ref: thrustRef,
}: {
  icon: string;
  label: string;
  ref: { current: boolean };
}) {
  return (
    <div
      style={BTN}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        thrustRef.current = true;
      }}
      onPointerUp={() => {
        thrustRef.current = false;
      }}
      onPointerCancel={() => {
        thrustRef.current = false;
      }}
      onPointerLeave={() => {
        thrustRef.current = false;
      }}
    >
      <span>{icon}</span>
      <span style={LABEL}>{label}</span>
    </div>
  );
}

export default function MobileControls() {
  if (!window.matchMedia('(pointer: coarse)').matches) return null;

  const SPACER: React.CSSProperties = { width: 64, height: 64 };

  return (
    <>
      {/* Movement cluster — bottom left: FWD on top, STR-L / REV / STR-R below */}
      <div
        style={{
          position: 'fixed',
          bottom: 80,
          left: 16,
          display: 'grid',
          gridTemplateColumns: '44px 44px 44px',
          gridTemplateRows: '44px 44px',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div style={SPACER} />
        <ThrustBtn icon="▲" label="FWD" ref={mobileThrustForward} />
        <div style={SPACER} />
        <ThrustBtn icon="◄" label="STR L" ref={mobileThrustStrafeLeft} />
        <ThrustBtn icon="▼" label="REV" ref={mobileThrustReverse} />
        <ThrustBtn icon="►" label="STR R" ref={mobileThrustStrafeRight} />
      </div>

      {/* Rotation cluster — bottom right */}
      <div
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          display: 'flex',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <ThrustBtn icon="↺" label="ROT L" ref={mobileThrustLeft} />
        <ThrustBtn icon="↻" label="ROT R" ref={mobileThrustRight} />
      </div>
    </>
  );
}
