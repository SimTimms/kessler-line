let _ejectCount = 0;

export function triggerEject(count: number): void {
  _ejectCount = count;
}

export function consumeEject(): number {
  const c = _ejectCount;
  _ejectCount = 0;
  return c;
}
