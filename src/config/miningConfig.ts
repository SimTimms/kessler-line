/** Ship module id for asteroid clamp mining. */
export const MINING_MODULE_ID = 'mining module';

/** Default module loadout for the player garbage scow. */
export const GARBAGE_SCOW_MODULES: string[] = [MINING_MODULE_ID];

/** Seconds of continuous mining required to extract one ore unit. */
export const MINING_CYCLE_SECONDS = 30;

/** Catalog item id granted each mining cycle. */
export const MINING_ORE_ITEM_ID = 'iron-slag';

/** Max relative impact speed (units/s) allowed to clamp onto an asteroid. */
export const MINING_CLAMP_MAX_RELATIVE_SPEED = 12;

/** Impulse applied away from the asteroid when releasing the clamp. */
export const MINING_CLAMP_UNDOCK_RELEASE_SPEED = 4;
