import type { RadioBroadcastDef } from '../../config/worldConfig';
import { TUTORIAL_CONTAINER_C_INVENTORY } from '../../config/containerInventoryConfig';
import { TUTORIAL_BATTLESHIP_SCAN } from '../../config/battleshipScanConfig';

/** In-scene radio contact for the tutorial lunar container (bay C). */
export const TUTORIAL_RADIO_BROADCAST: RadioBroadcastDef = {
  id: TUTORIAL_CONTAINER_C_INVENTORY.containerId,
  label: TUTORIAL_CONTAINER_C_INVENTORY.label ?? 'Metal Container',
  position: [0, 0, 0],
  dialogue: [
    'METAL CONTAINER BAY C — BROADCASTING.',
    'DOCKING AVAILABLE ON REQUEST.',
    'STANDING BY ON OPEN CHANNEL.',
  ],
  dockable: true,
  dockingBay: TUTORIAL_CONTAINER_C_INVENTORY.dockingBayId,
};

/** In-scene radio contact for the tutorial battleship. */
export const TUTORIAL_BATTLESHIP_RADIO_BROADCAST: RadioBroadcastDef = {
  id: TUTORIAL_BATTLESHIP_SCAN.id,
  label: TUTORIAL_BATTLESHIP_SCAN.label,
  position: [0, 0, 0],
  dialogue: [
    'HMS DREADNOUGHT — BROADCASTING ON GUARD FREQUENCY.',
    'ALL STATIONS THIS IS THE FLAGSHIP.',
    'REPORT POSITION AND BEARING ON ARRIVAL.',
  ],
};
