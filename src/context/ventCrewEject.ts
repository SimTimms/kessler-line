let pendingCrewEjects = 0;

export function queueCrewEject(count: number): void {
  if (count <= 0) return;
  pendingCrewEjects += count;
}

/** Returns how many crew to spawn this frame, then clears the pending count. */
export function consumeCrewEject(): number {
  const count = pendingCrewEjects;
  pendingCrewEjects = 0;
  return count;
}
