import type { ReactNode } from 'react';

interface CommsIdentityHeaderProps {
  /** Portrait image. A placeholder frame is drawn when the contact has none. */
  portrait?: string;
  /** Person (or vessel) the channel is open with. */
  name: string;
  /** Role / affiliation lines shown under the name; falsy entries are dropped. */
  lines: Array<string | null | undefined | false>;
  /** Header-right controls — dossier toggle, add-to-contacts, etc. */
  actions?: ReactNode;
}

/**
 * Portrait + name + role block shared by the docked station dialogue and the
 * ship-to-ship comms overlay, so both read as the same channel.
 */
export default function CommsIdentityHeader({
  portrait,
  name,
  lines,
  actions,
}: CommsIdentityHeaderProps) {
  const subLines = lines.filter((line): line is string => !!line);

  return (
    <div className="comms-chat-header comms-chat-header--character">
      {portrait ? (
        <img className="comms-chat-portrait" src={portrait} alt={name} />
      ) : (
        <div className="comms-chat-portrait comms-chat-portrait--empty" aria-hidden>
          NO
          <br />
          FEED
        </div>
      )}
      <div className="comms-chat-character-id">
        <div className="comms-chat-header-top">
          <div className="hud-title">{name}</div>
          {actions ? <div className="comms-chat-header-actions">{actions}</div> : null}
        </div>
        <div className="hud-subtitle-grey">
          {subLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
