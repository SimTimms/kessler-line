// Module-level refs for saved and historical contact IDs.
// ContactsHUD reads from these on mount; SaveManager captures/restores them.

const _savedContactIds = new Set<string>();
const _historicalContactIds = new Set<string>();

export function getSavedContactIds(): string[] {
  return [..._savedContactIds];
}

export function setSavedContactIds(ids: string[]): void {
  _savedContactIds.clear();
  for (const id of ids) _savedContactIds.add(id);
}

export function addSavedContactId(id: string): void {
  _savedContactIds.add(id);
}

export function hasSavedContactId(id: string): boolean {
  return _savedContactIds.has(id);
}

export function getHistoricalContactIds(): string[] {
  return [..._historicalContactIds];
}

export function setHistoricalContactIds(ids: string[]): void {
  _historicalContactIds.clear();
  for (const id of ids) _historicalContactIds.add(id);
}

export function addHistoricalContactId(id: string): void {
  _historicalContactIds.add(id);
}

export function hasHistoricalContactId(id: string): boolean {
  return _historicalContactIds.has(id);
}
