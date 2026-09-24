// Timed event trigger. Events are defined in events/, armed by id with a delay in ms.
// Delay: null or negative = parked until re-timed; 0 = next tick; > 0 = ms from now.

import { TIMED_EVENTS } from './events';

export type EventDelay = number | null;

export interface TimedEventDef {
  id: string;
  label?: string;
  run: () => void;
}

export type TimedEventStatus = 'waiting' | 'scheduled' | 'fired' | 'cancelled';

export interface TimedEventEntry {
  readonly id: string;
  readonly def: TimedEventDef;
  delayMs: EventDelay;
  status: TimedEventStatus;
  armedAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}

export const EVENT_TIMED_EVENT_FIRED = 'TimedEventFired';

export interface TimedEventFiredDetail {
  id: string;
  label?: string;
}

const schedule: TimedEventEntry[] = [];

function clearTimer(entry: TimedEventEntry): void {
  if (entry.timer !== null) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
  entry.armedAt = null;
}

function fire(entry: TimedEventEntry): void {
  entry.timer = null;
  entry.armedAt = null;
  entry.status = 'fired';
  try {
    entry.def.run();
  } catch (err) {
    console.error(`[event-trigger] "${entry.id}" threw during run()`, err);
  }
  window.dispatchEvent(
    new CustomEvent<TimedEventFiredDetail>(EVENT_TIMED_EVENT_FIRED, {
      detail: { id: entry.id, label: entry.def.label },
    })
  );
}

function arm(entry: TimedEventEntry, delayMs: EventDelay): void {
  clearTimer(entry);
  entry.delayMs = delayMs;

  if (delayMs === null || delayMs < 0) {
    entry.status = 'waiting';
    return;
  }

  entry.status = 'scheduled';
  entry.armedAt = Date.now();
  entry.timer = setTimeout(() => fire(entry), delayMs);
}

// Arm an event from the catalogue. Re-registering an armed id just re-times it.
export function registerTimedEvent(id: string, delayMs: EventDelay = null): TimedEventEntry | null {
  const def = TIMED_EVENTS.find((d) => d.id === id);
  if (!def) {
    console.warn(`[event-trigger] no event defined with id "${id}" — check events/index.ts`);
    return null;
  }

  let entry = schedule.find((e) => e.id === id);
  if (!entry) {
    entry = { id, def, delayMs: null, status: 'waiting', armedAt: null, timer: null };
    schedule.push(entry);
  }
  arm(entry, delayMs);
  return entry;
}

// Re-time an armed event from now, whatever its status. Use this to chain events.
export function setTimedEventDelay(id: string, delayMs: EventDelay): TimedEventEntry | null {
  const entry = schedule.find((e) => e.id === id);
  if (!entry) {
    console.warn(`[event-trigger] "${id}" is not registered — call registerTimedEvent first`);
    return null;
  }
  arm(entry, delayMs);
  return entry;
}

// Stop an event firing. It stays in the schedule and can be re-timed later.
export function cancelTimedEvent(id: string): void {
  const entry = schedule.find((e) => e.id === id);
  if (!entry) return;
  clearTimer(entry);
  entry.delayMs = null;
  entry.status = 'cancelled';
}

// Fire now, ignoring the delay.
export function triggerTimedEventNow(id: string): void {
  const entry = schedule.find((e) => e.id === id);
  if (!entry) {
    console.warn(`[event-trigger] "${id}" is not registered`);
    return;
  }
  clearTimer(entry);
  fire(entry);
}

// The live schedule array.
export function getTimedEvents(): readonly TimedEventEntry[] {
  return schedule;
}

export function getTimedEvent(id: string): TimedEventEntry | undefined {
  return schedule.find((e) => e.id === id);
}

// ms until this event fires, or null when it isn't on a timer.
export function getTimeUntilTrigger(id: string): number | null {
  const entry = schedule.find((e) => e.id === id);
  if (!entry || entry.armedAt === null || entry.delayMs === null || entry.delayMs < 0) return null;
  return Math.max(0, entry.armedAt + entry.delayMs - Date.now());
}

// Clear every timer and empty the schedule. Call on scene teardown.
export function resetTimedEvents(): void {
  for (const entry of schedule) clearTimer(entry);
  schedule.length = 0;
}
