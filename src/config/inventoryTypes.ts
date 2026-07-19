/** Shared inventory types — kept in config so dock/ship configs stay free of context imports. */

export interface InventorySlot {
  itemId: string;
  quantity: number;
  /** Max quantity this holder will carry for this item. */
  capacity?: number;
  /**
   * Excess pressure (0+). Higher = more willing to sell / lower ask price.
   */
  supply?: number;
  /**
   * Need pressure (0+). Higher = more willing to buy / higher bid price.
   */
  demand?: number;
  /**
   * Provenance tag — e.g. `'player'` when the player delivered salvage.
   * Stacks only merge when itemId and salvagedBy both match.
   */
  salvagedBy?: string;
}

/** Canonical tag applied when the player delivers salvage to a depot. */
export const PLAYER_SALVAGED_BY = 'player';

export interface InventoryBlueprint {
  label?: string;
  slots?: InventorySlot[];
}
