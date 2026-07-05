const rendezvousShips = new Set<string>();

function emit(shipId: string, active: boolean): void {
  window.dispatchEvent(new CustomEvent('RendezvousUpdated', { detail: { shipId, active } }));
}

export function hasShipRendezvous(shipId: string): boolean {
  return rendezvousShips.has(shipId);
}

export function acceptShipRendezvous(shipId: string): void {
  if (rendezvousShips.has(shipId)) return;
  rendezvousShips.add(shipId);
  emit(shipId, true);
}

export function clearShipRendezvous(shipId: string): void {
  if (!rendezvousShips.has(shipId)) return;
  rendezvousShips.delete(shipId);
  emit(shipId, false);
}

export function clearAllRendezvous(): void {
  if (rendezvousShips.size === 0) return;
  for (const shipId of rendezvousShips) emit(shipId, false);
  rendezvousShips.clear();
}
