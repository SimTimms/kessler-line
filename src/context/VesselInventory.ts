const DEFAULT_MAX_FUEL = 100;

type VesselInventoryEntry = {
  fuel: number;
  maxFuel: number;
};

const inventories = new Map<string, VesselInventoryEntry>();

export function ensureVesselInventory(vesselId: string, initialFuel = DEFAULT_MAX_FUEL): void {
  if (inventories.has(vesselId)) return;
  const maxFuel = Math.max(0, initialFuel);
  inventories.set(vesselId, { fuel: maxFuel, maxFuel });
}

export function getVesselFuel(vesselId: string): number {
  return inventories.get(vesselId)?.fuel ?? 0;
}

export function getVesselMaxFuel(vesselId: string): number {
  return inventories.get(vesselId)?.maxFuel ?? DEFAULT_MAX_FUEL;
}

export function setVesselFuel(vesselId: string, fuel: number): void {
  const entry = inventories.get(vesselId);
  if (!entry) return;
  entry.fuel = Math.max(0, Math.min(entry.maxFuel, fuel));
}

export function drainVesselFuel(vesselId: string, amount: number): void {
  if (amount <= 0) return;
  const entry = inventories.get(vesselId);
  if (!entry) return;
  entry.fuel = Math.max(0, entry.fuel - amount);
}

export function canVesselPropulsion(vesselId: string): boolean {
  return getVesselFuel(vesselId) > 0;
}

export function clearVesselInventory(vesselId: string): void {
  inventories.delete(vesselId);
}
