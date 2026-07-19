/** Shared salvage depot bag id — berth + drop-off pad both use this inventory. */
export const SALVAGE_DEPOT_INVENTORY_ID = 'salvage-depot';

export const SALVAGE_DROPOFF_PAD_ID = 'salvage-dropoff';
export const SALVAGE_DROPOFF_PAD_LABEL = 'Salvage Intake';

/** Radio / hail contact id for the drop-off pad broadcast. */
export const SALVAGE_DROPOFF_RADIO_ID = 'salvage-intake-radio';

/** Dialogue tree id for the post-delivery radio hail. */
export const SALVAGE_DROPOFF_HAIL_TREE_ID = 'salvage-intake-delivery';

/** Planar capture radius around the intake pad (world units). */
export const SALVAGE_DROPOFF_CAPTURE_RADIUS = 32;

/** Max crate speed (units/s) allowed for intake capture after release. */
export const SALVAGE_DROPOFF_MAX_SPEED = 12;

export const SALVAGE_DROPOFF_ALIGN_SPEED = 2.8;
export const SALVAGE_DROPOFF_ROTATE_SPEED = 1.8;
export const SALVAGE_DROPOFF_DESCEND_SPEED = 2.2;

/** Local Y on the pad anchor where the crate rests after descend. */
export const SALVAGE_DROPOFF_REST_LOCAL_Y = 0;

/** Fair share of tagged salvage value a player may claim for an accept. */
export const SALVAGE_CLAIM_PLAYER_SHARE_RATIO = 0.5;

/** Counter aims to leave the house with this share of tagged value. */
export const SALVAGE_CLAIM_HOUSE_SHARE_RATIO = 0.55;

export const EVENT_CARGO_DROPOFF_STARTED = 'CargoDropOffStarted';
export const EVENT_CARGO_DROPOFF_COMPLETED = 'CargoDropOffCompleted';

export type CargoDropOffStartedDetail = {
  cargoId: string;
  padId: string;
};

export type CargoDropOffCompletedDetail = {
  cargoId: string;
  padId: string;
  inventoryOwnerId: string;
  unitsTransferred: number;
};
