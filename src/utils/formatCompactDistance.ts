/**
 * Compact distance labels: millions → 286M, thousands → 407k, else raw units.
 * Pass `unitSuffix` (e.g. `"m"`) to append a unit only in the sub-thousand range.
 */
export function formatCompactDistance(
  dist: number,
  options?: { unitSuffix?: string }
): string {
  const d = Math.abs(dist);
  if (d >= 1_000_000) return `${Math.round(d / 1_000_000)}M`;
  if (d >= 1_000) return `${Math.round(d / 1_000)}k`;
  const n = Math.round(d);
  return options?.unitSuffix ? `${n}${options.unitSuffix}` : `${n}`;
}
