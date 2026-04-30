import { memo } from 'react';
import { TUTORIAL_STEPS } from '../../tutorial/tutorialSteps';
import './TutorialOverlay.css';
import tutorialPortrait from '../../assets/administrator.jpg';

interface Props {
  currentStep: number;
  onComplete: () => void;
}

const TutorialOverlay = memo(function TutorialOverlay({ currentStep, onComplete }: Props) {
  const isDone = currentStep >= TUTORIAL_STEPS.length;
  const step = !isDone ? TUTORIAL_STEPS[currentStep] : null;

  return (
    <div className="tutorial-overlay">
      {/* ── Active step card ────────────────────────────────────────── */}
      {step && (
        <div className="tutorial-overlay__step-card">
          <div className="tutorial-overlay__portrait-slot">
            <img
              src={tutorialPortrait}
              alt="Tutorial contact portrait"
              className="tutorial-overlay__portrait-image"
            />
          </div>
          <div className="tutorial-overlay__step-content">
            <div className="tutorial-overlay__contact-meta">
              <span className="tutorial-overlay__contact-name">Phil Wiles</span>
              <span className="tutorial-overlay__contact-role">Licensing Invigilator</span>
            </div>
            <div className="tutorial-overlay__contact-divider" />
            <div className="tutorial-overlay__step-title">{step.title}</div>
            <div
              className={`tutorial-overlay__step-prompt${step.keys.length > 0 ? '' : ' tutorial-overlay__step-prompt--no-keys'}`}
            >
              {step.prompt}
            </div>
            {step.keys.length > 0 && (
              <div className="tutorial-overlay__keys">
                {step.keys.map((k) => (
                  <span key={k} className="tutorial-overlay__key-badge">
                    {k}
                  </span>
                ))}
              </div>
            )}
            {step.detail && <div className="tutorial-overlay__step-detail">{step.detail}</div>}
          </div>
        </div>
      )}

      {/* ── Progress dots ───────────────────────────────────────────── */}
      {!isDone && (
        <div className="tutorial-overlay__progress-dots">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`tutorial-overlay__progress-dot${
                i < currentStep
                  ? ' tutorial-overlay__progress-dot--done'
                  : i === currentStep
                    ? ' tutorial-overlay__progress-dot--current'
                    : ''
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Skip button ─────────────────────────────────────────────── */}
      {!isDone && (
        <button type="button" onClick={onComplete} className="tutorial-overlay__skip-btn">
          Skip Tutorial
        </button>
      )}

      {/* ── Completion screen ───────────────────────────────────────── */}
      {isDone && (
        <div className="tutorial-overlay__complete-card">
          <div className="tutorial-overlay__complete-kicker">Systems Check Complete</div>
          <div className="tutorial-overlay__complete-title">Pilot Ready</div>
          <div className="tutorial-overlay__complete-copy">
            You have command of your vessel.
            <br />
            The outer system awaits.
          </div>
          <button type="button" onClick={onComplete} className="tutorial-overlay__begin-btn">
            Begin Mission
          </button>
        </div>
      )}
    </div>
  );
});

export default TutorialOverlay;
