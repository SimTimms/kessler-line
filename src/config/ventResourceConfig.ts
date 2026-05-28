import { SHIP_CREW_CAPACITY, SHIP_RESOURCE_MAX } from './dockTransferConfig';

export type VentResourceKind = 'fuel' | 'o2' | 'power' | 'crew' | 'cargo';

export const VENT_RESOURCE_CHANGED = 'VentResourceChanged';
