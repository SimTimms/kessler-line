import type { ReactNode } from 'react';
import { formatTime } from './commsUtils';
import type { ChatThread } from '../../context/ChatStore';
import type { HailStatus } from '../../context/HailState';
import type { StaticContact } from '../../narrative/contacts';

type DisplayRow = {
  id: string;
  role: 'npc' | 'player';
  senderName?: string;
  content: ReactNode;
  timestamp: number;
  timeLabel?: ReactNode;
};

interface DialogMessagesProps {
  isPreHail: boolean;
  isIncoming: boolean;
  effectiveHailStatus: HailStatus;
  isRadioActive: boolean;
  hailOfferContent?: { header: string; body: string };
  contact: StaticContact | null;
  displayRows: DisplayRow[];
  thread: ChatThread | null;
  shipName: string;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onHail?: () => void;
  onAcceptHail?: () => void;
  onDeclineHail?: () => void;
}
export default function DialogMessages({
  isPreHail,
  isIncoming,
  effectiveHailStatus,
  isRadioActive,
  hailOfferContent,
  contact,
  displayRows,
  thread,
  shipName,
  bottomRef,
  onHail,
  onAcceptHail,
  onDeclineHail,
}: DialogMessagesProps) {
  const handleHail = onHail ?? (() => undefined);
  const handleAcceptHail = onAcceptHail ?? (() => undefined);
  const handleDeclineHail = onDeclineHail ?? (() => undefined);

  return (
    <div className="comms-chat-messages">
      {isPreHail ? (
        <>
          {isIncoming && (
            <div className="comms-chat-prehail">
              {hailOfferContent ? (
                <div className="comms-chat-offer">
                  <div className="comms-chat-offer-header">{hailOfferContent.header}</div>
                  <div className="comms-chat-offer-body">{hailOfferContent.body}</div>
                </div>
              ) : (
                <div className="comms-chat-incoming-label">⊛ INCOMING HAIL</div>
              )}
              <div className="comms-chat-hail-actions">
                <button className="comms-chat-accept-btn" onClick={handleAcceptHail}>
                  ACCEPT
                </button>
                <button className="comms-chat-decline-btn" onClick={handleDeclineHail}>
                  DECLINE
                </button>
              </div>
            </div>
          )}
          {!isIncoming && effectiveHailStatus === 'none' && isRadioActive && (
            <div className="comms-chat-prehail">
              <button className="comms-chat-hail-btn" onClick={handleHail}>
                HAIL {shipName.toUpperCase()}
              </button>
            </div>
          )}
          {!isIncoming && effectiveHailStatus === 'none' && !isRadioActive && (
            <div className="comms-chat-prehail">
              <div className="comms-chat-status-line">○ OUT OF RADIO RANGE</div>
            </div>
          )}
          {!isIncoming && effectiveHailStatus === 'pending' && (
            <div className="comms-chat-prehail">
              <div className="comms-chat-status-line comms-chat-status-line--pulse">
                ◈ AWAITING RESPONSE...
              </div>
            </div>
          )}
          {!isIncoming && effectiveHailStatus === 'rejected' && (
            <div className="comms-chat-prehail">
              <div className="comms-chat-status-line comms-chat-status-line--rejected">
                ✕ HAIL DECLINED
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {contact && displayRows.length === 0 && (
            <div className="comms-chat-connecting">— NO MESSAGES —</div>
          )}
          {!contact && displayRows.length === 0 && thread?.awaitingNpc && (
            <div className="comms-chat-connecting">
              <span className="comms-chat-ellipsis">◈ OPENING CHANNEL</span>
            </div>
          )}

          {displayRows.map((row) => (
            <div key={row.id} className={`comms-chat-row comms-chat-row--${row.role}`}>
              {row.role === 'npc' && row.senderName && (
                <div className="comms-chat-sender">{row.senderName}</div>
              )}
              <div className={`comms-chat-bubble comms-chat-bubble--${row.role}`}>
                {row.content}
              </div>
              <div className="comms-chat-time">{row.timeLabel ?? formatTime(row.timestamp)}</div>
            </div>
          ))}

          {!contact && displayRows.length > 0 && thread?.awaitingNpc && (
            <div className="comms-chat-row comms-chat-row--npc">
              <div className="comms-chat-sender">{thread.captainName}</div>
              <div className="comms-chat-bubble comms-chat-bubble--pending">
                <span className="comms-chat-ellipsis">◈ TRANSMITTING</span>
              </div>
            </div>
          )}
        </>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
