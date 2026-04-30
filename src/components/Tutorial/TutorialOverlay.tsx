import { memo, useEffect, useState } from 'react';
import type { TutorialStep } from '../../tutorial/tutorialSteps';
import { displayLabelForKeyCode } from '../../config/keybindings';
import './TutorialOverlay.css';
import tutorialPortrait from '../../assets/administrator.jpg';

interface Props {
  steps: TutorialStep[];
  currentStep: number;
  onComplete: () => void;
  onSkip?: () => void;
  onContinueStep: () => void;
  completionKicker?: string;
  completionTitle?: string;
  completionCopy?: string;
  completeButtonLabel?: string;
}

const TutorialOverlay = memo(function TutorialOverlay({
  steps,
  currentStep,
  onComplete,
  onSkip,
  onContinueStep,
  completionKicker = 'Systems Check Complete',
  completionTitle = 'Pilot Ready',
  completionCopy = 'You have command of your vessel.\nThe outer system awaits.',
  completeButtonLabel = 'Begin Mission',
}: Props) {
  const isDone = currentStep >= steps.length;
  const step = !isDone ? steps[currentStep] : null;
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const label = displayLabelForKeyCode(e.code);
      setPressedKeys((prev) => {
        if (prev.has(label)) return prev;
        const next = new Set(prev);
        next.add(label);
        return next;
      });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const label = displayLabelForKeyCode(e.code);
      setPressedKeys((prev) => {
        if (!prev.has(label)) return prev;
        const next = new Set(prev);
        next.delete(label);
        return next;
      });
    };
    const onBlur = () => setPressedKeys(new Set());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const handleSkip = onSkip ?? onComplete;

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
                  <span
                    key={k}
                    className={`tutorial-overlay__key-badge${
                      pressedKeys.has(k) ? ' tutorial-overlay__key-badge--active' : ''
                    }`}
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
            {step.detail && <div className="tutorial-overlay__step-detail">{step.detail}</div>}
            {step.requiresContinue && (
              <button
                type="button"
                onClick={onContinueStep}
                className="tutorial-overlay__continue-btn"
              >
                {step.continueLabel ?? 'Continue'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Skip button ─────────────────────────────────────────────── */}
      {!isDone && (
        <button type="button" onClick={handleSkip} className="tutorial-overlay__skip-btn">
          Skip Tutorial
        </button>
      )}

      {/* ── Completion screen ───────────────────────────────────────── */}
      {isDone && (
        <div className="tutorial-overlay__complete-card">
          <div className="tutorial-overlay__complete-kicker">{completionKicker}</div>
          <div className="tutorial-overlay__complete-title">{completionTitle}</div>
          <div className="tutorial-overlay__complete-copy">{completionCopy}</div>
          <button type="button" onClick={onComplete} className="tutorial-overlay__begin-btn">
            {completeButtonLabel}
          </button>
        </div>
      )}
    </div>
  );
});

export default TutorialOverlay;
