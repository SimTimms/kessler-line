/** Signed resource change per second (+ gain, − drain). Updated each physics frame. */
export const resourceRateRefs = {
  power: { current: 0 },
  fuel: { current: 0 },
  o2: { current: 0 },
  hull: { current: 0 },
};

export function clearResourceRates(): void {
  resourceRateRefs.power.current = 0;
  resourceRateRefs.fuel.current = 0;
  resourceRateRefs.o2.current = 0;
  resourceRateRefs.hull.current = 0;
}
