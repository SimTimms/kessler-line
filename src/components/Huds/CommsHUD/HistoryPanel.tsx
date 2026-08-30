import { useEffect, useRef, useState } from 'react';
import { getAllThreads, type ChatThread } from '../../../context/ChatStore';
import { messageStore, type InboxMessage } from '../../../context/MessageStore';
import { getInstalledBufferId, subscribeCommsBuffer } from '../../../context/CommsBufferStore';

// ── Types ────────────────────────────────────────────────────────────────────

interface ConversationEntry {
  id: string;
  label: string;
  sublabel: string;
  messageCount: number;
  lastTimestamp: number;
  kind: 'thread' | 'inbox';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Group inbox messages by sender. */
function groupInboxBySender(messages: InboxMessage[]): Map<string, InboxMessage[]> {
  const groups = new Map<string, InboxMessage[]>();
  for (const m of messages) {
    const key = m.from;
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  return groups;
}

function buildConversationList(): ConversationEntry[] {
  const entries: ConversationEntry[] = [];

  // Chat threads (radio NPC dialogues)
  for (const [, thread] of getAllThreads()) {
    if (thread.messages.length === 0) continue;
    entries.push({
      id: `thread:${thread.shipId}`,
      label: thread.shipName,
      sublabel: `${thread.captainName} · RADIO`,
      messageCount: thread.messages.length,
      lastTimestamp: thread.messages[thread.messages.length - 1].timestamp,
      kind: 'thread',
    });
  }

  // Inbox messages grouped by sender
  const groups = groupInboxBySender(messageStore.current);
  for (const [sender, msgs] of groups) {
    const sorted = [...msgs].sort((a, b) => a.timestamp - b.timestamp);
    const platforms = [...new Set(sorted.map((m) => m.platform).filter(Boolean))];
    entries.push({
      id: `inbox:${sender}`,
      label: sender,
      sublabel: platforms.length > 0 ? platforms.join(' · ') : 'INBOX',
      messageCount: sorted.length,
      lastTimestamp: sorted[sorted.length - 1].timestamp,
      kind: 'inbox',
    });
  }

  // Sort by most recent first
  entries.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  return entries;
}

// ── Detail views ─────────────────────────────────────────────────────────────

function ThreadDetail({ thread }: { thread: ChatThread }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, []);
  return (
    <div className="history-detail-scroll" ref={scrollRef}>
      {thread.messages.map((msg) => (
        <div key={msg.id} className={`comms-chat-row comms-chat-row--${msg.role}`}>
          {msg.role === 'npc' && (
            <div className="comms-chat-sender">{thread.captainName}</div>
          )}
          <div className={`chat-log-text comms-chat-bubble--${msg.role}`}>{msg.text}</div>
        </div>
      ))}
    </div>
  );
}

function InboxDetail({ sender }: { sender: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgs = messageStore.current
    .filter((m) => m.from === sender)
    .sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, []);

  return (
    <div className="history-detail-scroll" ref={scrollRef}>
      {msgs.map((msg) => (
        <div key={msg.id} className="comms-chat-row comms-chat-row--npc">
          <div className="comms-chat-sender">{msg.subject}</div>
          <div className="chat-log-text comms-chat-bubble--npc">{msg.body}</div>
          {msg.repliedWith && msg.replies && (() => {
            const reply = msg.replies.find((r) => r.id === msg.repliedWith);
            if (!reply) return null;
            return (
              <div className="comms-chat-row comms-chat-row--player" style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                <div className="chat-log-text comms-chat-bubble--player">{reply.playerText}</div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function HistoryPanel() {
  const [entries, setEntries] = useState(buildConversationList);
  const [selected, setSelected] = useState<ConversationEntry | null>(null);
  const bufferIdRef = useRef(getInstalledBufferId());

  // Rebuild list + reset detail view whenever live data or buffer changes
  useEffect(() => {
    const refresh = () => setEntries(buildConversationList());

    // When the buffer itself changes, clear the detail selection and rebuild
    const unsubBuffer = subscribeCommsBuffer(() => {
      const newId = getInstalledBufferId();
      if (newId !== bufferIdRef.current) {
        bufferIdRef.current = newId;
        setSelected(null);
      }
      refresh();
    });

    window.addEventListener('InboxUpdated', refresh);
    window.addEventListener('ChatUpdated', refresh);
    return () => {
      unsubBuffer();
      window.removeEventListener('InboxUpdated', refresh);
      window.removeEventListener('ChatUpdated', refresh);
    };
  }, []);

  if (selected) {
    const threadId = selected.kind === 'thread' ? selected.id.replace('thread:', '') : null;
    const thread = threadId ? getAllThreads().get(threadId) ?? null : null;
    const inboxSender = selected.kind === 'inbox' ? selected.id.replace('inbox:', '') : null;

    return (
      <div className="comms-history-panel">
        <div className="history-detail-header">
          <button
            type="button"
            className="history-back-btn"
            onClick={() => setSelected(null)}
          >
            &lt; BACK
          </button>
          <span className="history-detail-title">{selected.label}</span>
        </div>
        {thread && <ThreadDetail thread={thread} />}
        {inboxSender && <InboxDetail sender={inboxSender} />}
      </div>
    );
  }

  return (
    <div className="comms-history-panel">
      <div className="comms-history-scroll">
        {entries.length === 0 ? (
          <div className="event-log-empty">No message history</div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="history-entry"
              onClick={() => setSelected(entry)}
            >
              <span className="history-entry-label">{entry.label}</span>
              <span className="history-entry-sub">{entry.sublabel}</span>
              <span className="history-entry-count">{entry.messageCount}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
