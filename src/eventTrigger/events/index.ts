/**
 * Catalogue of every timed event. One file per event in this folder; add its
 * def to TIMED_EVENTS below and it becomes armable by id.
 *
 * Being in this list does NOT schedule anything — a scene still has to call
 * `registerTimedEvent(id, delayMs)` to arm it.
 */

import type { TimedEventDef } from '../event-trigger';
import { eliasVossHailEvent } from './elias-voss-hail';

export const TIMED_EVENTS: readonly TimedEventDef[] = [eliasVossHailEvent];

export { ELIAS_VOSS_HAIL_EVENT_ID, eliasVossHailEvent } from './elias-voss-hail';
