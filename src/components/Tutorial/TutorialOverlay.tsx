import { memo } from 'react';
import { TUTORIAL_STEPS } from '../../tutorial/tutorialSteps';

interface Props {
  currentStep: number;
  onComplete: () => void;
}

const KEY_BADGE: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(0,200,255,0.12)',
  border: '1px solid rgba(0,200,255,0.45)',
  borderRadius: '5px',
  padding: '4px 12px',
  fontSize: '14px',
  fontWeight: 700,
  color: '#00cfff',
  fontFamily: 'monospace',
  letterSpacing: '0.04em',
};

const TutorialOverlay = memo(function TutorialOverlay({ currentStep, onComplete }: Props) {
  const isDone = currentStep >= TUTORIAL_STEPS.length;
  const step = !isDone ? TUTORIAL_STEPS[currentStep] : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
        fontFamily: 'var(--hud-font, "Space Grotesk", sans-serif)',
      }}
    >
      {/* ── Active step card ────────────────────────────────────────── */}
      {step && (
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 8, 18, 0.88)',
            border: '1px solid rgba(0, 200, 255, 0.35)',
            borderRadius: '8px',
            padding: '18px 28px',
            minWidth: '340px',
            maxWidth: '480px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(0,200,255,0.5)',
              letterSpacing: '0.12em',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            Step {currentStep + 1} / {TUTORIAL_STEPS.length}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#00cfff',
              marginBottom: '8px',
              letterSpacing: '0.03em',
            }}
          >
            {step.title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(200,230,255,0.85)',
              lineHeight: 1.55,
              marginBottom: step.keys.length > 0 ? '14px' : '0',
            }}
          >
            {step.prompt}
          </div>
          {step.keys.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {step.keys.map((k) => (
                <span key={k} style={KEY_BADGE}>
                  {k}
                </span>
              ))}
            </div>
          )}
          {step.detail && (
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(0,200,255,0.45)',
                marginTop: '10px',
                letterSpacing: '0.03em',
              }}
            >
              {step.detail}
            </div>
          )}
        </div>
      )}

      {/* ── Progress dots ───────────────────────────────────────────── */}
      {!isDone && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
          }}
        >
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background:
                  i < currentStep
                    ? '#00cfff'
                    : i === currentStep
                      ? 'rgba(0,200,255,0.7)'
                      : 'rgba(0,200,255,0.15)',
                border:
                  i === currentStep
                    ? '2px solid rgba(0,200,255,0.9)'
                    : '2px solid rgba(0,200,255,0.25)',
                transition: 'background 0.3s, border 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Skip button ─────────────────────────────────────────────── */}
      {!isDone && (
        <button
          type="button"
          onClick={onComplete}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            pointerEvents: 'all',
            background: 'transparent',
            border: '1px solid rgba(0,200,255,0.2)',
            borderRadius: '5px',
            color: 'rgba(0,200,255,0.5)',
            fontSize: '11px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Skip Tutorial
        </button>
      )}

      {/* ── Completion screen ───────────────────────────────────────── */}
      {isDone && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 8, 18, 0.92)',
            border: '1px solid rgba(0, 200, 255, 0.45)',
            borderRadius: '10px',
            padding: '40px 52px',
            textAlign: 'center',
            pointerEvents: 'all',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(0,255,136,0.7)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Systems Check Complete
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#00cfff',
              marginBottom: '14px',
              letterSpacing: '0.04em',
            }}
          >
            Pilot Ready
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(200,230,255,0.75)',
              lineHeight: 1.65,
              marginBottom: '30px',
            }}
          >
            You have command of your vessel.
            <br />
            The outer system awaits.
          </div>
          <button
            type="button"
            onClick={onComplete}
            style={{
              background: 'rgba(0,200,255,0.08)',
              border: '1px solid rgba(0,200,255,0.65)',
              borderRadius: '6px',
              color: '#00cfff',
              fontSize: '14px',
              fontWeight: 700,
              padding: '11px 32px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Begin Mission
          </button>
        </div>
      )}
    </div>
  );
});

export default TutorialOverlay;
