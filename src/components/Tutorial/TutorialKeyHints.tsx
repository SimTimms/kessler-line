import { displayLabelForKeyCode } from '../../config/keybindings';
import type { TutorialKeyHint } from '../../tutorial/tutorialSteps';
import './TutorialKeyHints.css';

type Props = {
  hints: TutorialKeyHint[];
  /** Keyboard labels (from `displayLabelForKeyCode`) that are currently held. */
  pressedKeyLabels: Set<string>;
  mouseLeftHeld: boolean;
  /** Left button down and pointer moving — highlights “move” during orbit drag. */
  mouseOrbiting: boolean;
  scrollActive: boolean;
};

function KeyCap({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`tutorial-key-hint__cap${active ? ' tutorial-key-hint__cap--active' : ''}`}
      role="img"
      aria-label={label}
    >
      <span className="tutorial-key-hint__cap-label">{label}</span>
    </span>
  );
}

function IconMouseLeft({ active }: { active: boolean }) {
  return (
    <span
      className={`tutorial-key-hint__icon tutorial-key-hint__icon--mouse${active ? ' tutorial-key-hint__icon--active' : ''}`}
      role="img"
      aria-label="Left mouse button"
    >
      <svg viewBox="0 0 40 56" className="tutorial-key-hint__svg" aria-hidden>
        <path
          className="tutorial-key-hint__mouse-body"
          d="M20 4C12 4 6 10.5 6 20v20c0 8 5.5 14.5 14 14.5S34 48 34 40V20c0-9.5-6-16-14-16z"
        />
        <path
          className="tutorial-key-hint__mouse-left"
          d="M20 4c-2.2 0-4.1.4-5.7 1.1L8 20v20c0 1.2.1 2.3.3 3.3h11.7V4z"
        />
        <line x1="20" y1="10" x2="20" y2="24" className="tutorial-key-hint__mouse-wheel" />
      </svg>
    </span>
  );
}

function IconMouseMove({ active }: { active: boolean }) {
  return (
    <span
      className={`tutorial-key-hint__icon${active ? ' tutorial-key-hint__icon--active' : ''}`}
      role="img"
      aria-label="Move mouse"
    >
      <svg viewBox="0 0 56 56" className="tutorial-key-hint__svg tutorial-key-hint__svg--move" aria-hidden>
        <polygon className="tutorial-key-hint__arrow" points="28,4 32,14 24,14" />
        <polygon className="tutorial-key-hint__arrow" points="52,28 42,32 42,24" />
        <polygon className="tutorial-key-hint__arrow" points="28,52 24,42 32,42" />
        <polygon className="tutorial-key-hint__arrow" points="4,28 14,24 14,32" />
      </svg>
    </span>
  );
}

function IconScrollWheel({ active }: { active: boolean }) {
  return (
    <span
      className={`tutorial-key-hint__icon tutorial-key-hint__icon--scroll${active ? ' tutorial-key-hint__icon--active' : ''}`}
      role="img"
      aria-label="Scroll wheel"
    >
      <svg viewBox="0 0 40 56" className="tutorial-key-hint__svg" aria-hidden>
        <path
          className="tutorial-key-hint__mouse-body"
          d="M20 4C12 4 6 10.5 6 20v20c0 8 5.5 14.5 14 14.5S34 48 34 40V20c0-9.5-6-16-14-16z"
        />
        <rect x="15" y="11" width="10" height="14" rx="2" className="tutorial-key-hint__scroll-bump" />
        <polygon className="tutorial-key-hint__chev" points="20,3 24,9 16,9" />
        <polygon className="tutorial-key-hint__chev" points="20,36 16,30 24,30" />
      </svg>
    </span>
  );
}

export default function TutorialKeyHints({
  hints,
  pressedKeyLabels,
  mouseLeftHeld,
  mouseOrbiting,
  scrollActive,
}: Props) {
  return (
    <div className="tutorial-key-hints">
      {hints.map((hint, i) => {
        const key = `${hint.kind}-${i}`;
        switch (hint.kind) {
          case 'keyboard': {
            const label = displayLabelForKeyCode(hint.code);
            return (
              <KeyCap key={key} label={label} active={pressedKeyLabels.has(label)} />
            );
          }
          case 'mouseLeft':
            return <IconMouseLeft key={key} active={mouseLeftHeld} />;
          case 'mouseMove':
            return <IconMouseMove key={key} active={mouseOrbiting} />;
          case 'scrollWheel':
            return <IconScrollWheel key={key} active={scrollActive} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
